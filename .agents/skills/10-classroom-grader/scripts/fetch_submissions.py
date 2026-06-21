import os
import json
import argparse
import sys
from classroom_api_client import get_access_token, fetch_submissions, download_drive_file

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def clean_string(s):
    return "".join([c for c in s if c.isalnum() or c in ' ._-']).strip()

def file_priority(x):
    fname = x["filename"]
    if fname is None:
        return 4
    fname_lower = fname.lower()
    if fname_lower.endswith(('.png', '.jpg', '.jpeg')):
        return 0
    if fname_lower.endswith('.ettx') or fname_lower.endswith('.etkx'):
        return 1
    if fname_lower.endswith('.docx'):
        return 2
    if fname_lower.endswith('.pdf'):
        return 3
    return 5

def main():
    parser = argparse.ArgumentParser(description="Fetch student submissions for a classroom coursework.")
    parser.add_argument("--course-id", required=True)
    parser.add_argument("--coursework-id", required=True)
    parser.add_argument("--class-num", required=True)
    parser.add_argument("--token-path", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--assignment-type", choices=["timetable", "sticker"], required=True)
    
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Refreshing access token using {args.token_path}...")
    access_token = get_access_token(args.token_path)
    
    print(f"Fetching submissions for class {args.class_num}...")
    submissions, students_map = fetch_submissions(access_token, args.course_id, args.coursework_id)
    
    raw_info = []
    
    for sub in submissions:
        student_name = students_map.get(sub['userId'], 'Unknown')
        clean_student = clean_string(student_name)
        
        attachments = sub.get('assignmentSubmission', {}).get('attachments', [])
        drive_files = [att['driveFile'] for att in attachments if 'driveFile' in att]
        
        if not drive_files:
            raw_info.append({
                "studentName": student_name,
                "userId": sub['userId'],
                "submissionId": sub['id'],
                "filename": None,
                "localPath": None,
                "state": sub['state'],
                "title": None
            })
            continue
            
        for df in drive_files:
            file_id = df['id']
            title = df['title']
            clean_title = clean_string(title)
            filename = f"{clean_student}_{clean_title}"
            output_path = os.path.join(args.output_dir, filename)
            
            try:
                download_drive_file(access_token, file_id, output_path)
                print(f"Downloaded {title} for {student_name}")
                raw_info.append({
                    "studentName": student_name,
                    "userId": sub['userId'],
                    "submissionId": sub['id'],
                    "filename": filename,
                    "localPath": output_path,
                    "state": sub['state'],
                    "title": title
                })
            except Exception as e:
                print(f"Failed to download {title} for {student_name}: {e}")
                
    # Save the raw download list
    with open(os.path.join(args.output_dir, 'download_info.json'), 'w', encoding='utf-8') as f:
        json.dump(raw_info, f, ensure_ascii=False, indent=2)
        
    # Deduplicate: select best file per student
    student_files = {}
    for item in raw_info:
        sname = item["studentName"]
        if sname not in student_files:
            student_files[sname] = []
        student_files[sname].append(item)
        
    selected_submissions = []
    for sname, items in student_files.items():
        items.sort(key=file_priority)
        selected_submissions.append(items[0])
        
    selected_submissions.sort(key=lambda x: x["studentName"])
    
    # Generate batch prompts directly into a JSON file
    total_students = len(selected_submissions)
    num_batches = 2 if total_students <= 30 else 3
    batch_size = (total_students + num_batches - 1) // num_batches
    batches = [selected_submissions[i:i + batch_size] for i in range(0, total_students, batch_size)]
    
    prompt_batches = []
    for idx, batch in enumerate(batches):
        prompt = f"Please grade the following student submissions for class {args.class_num} (if file is None or ETTX/docx, follow special instructions):\n"
        for k, s in enumerate(batch):
            student = s["studentName"]
            filename = s["filename"]
            local_path = s["localPath"]
            
            if filename is None:
                prompt += f"{k+1}. {student}: None (unsubmitted, score 0, comment: '未交')\n"
            elif filename.lower().endswith(('.ettx', '.etkx')):
                prompt += f"{k+1}. {student}: {local_path} (score 70, comment: '僅上傳 .ETTX 專案檔，未導出為圖片檔，因此無法直接預覽，請導出為 PNG/JPG 重傳。若補傳後元素齊全可補分。')\n"
            elif filename.lower().endswith('.docx'):
                prompt += f"{k+1}. {student}: {local_path} (score 70, comment: '僅上傳 .docx 文件，未導出為圖片檔，請導出為 PNG/JPG 重傳。')\n"
            elif filename.lower().endswith('.pdf'):
                prompt += f"{k+1}. {student}: {local_path} (score 70, comment: '僅上傳 PDF 檔案，未導出為圖片檔，請導出為 PNG/JPG 重傳。')\n"
            else:
                prompt += f"{k+1}. {student}: {local_path}\n"
                
        if args.assignment_type == "sticker":
            prompt += "\nGrading criteria:\n"
            prompt += "1. Base score: 85 points if they designed their own photo into a sticker (大頭貼) format.\n"
            prompt += "2. Bonus: If they also added other background, illustration, or decoration elements, and the sticker shows good aesthetic appeal, add 5 to 10 points (score up to 95 max).\n"
            prompt += "3. If the layout is cluttered, if the text/illustrations overlap severely and obscure their photo, or if it is not in a sticker/photo frame format, deduct 5 to 10 points depending on severity.\n"
        else:
            prompt += "\nGrading criteria:\n"
            prompt += "1. Base score: 85 points if Title, Table, Illustration, and Background are all present.\n"
            prompt += "2. Deduct 5 points for each missing element.\n"
            prompt += "3. Add 5 to 10 points for good aesthetic appeal (max 95).\n"
            prompt += "4. Deduct 5 to 10 points for timetable content errors.\n"
            
        prompt += "\nPlease return the results in the specified JSON format.\n"
        
        prompt_batches.append({
            "class": args.class_num,
            "batch": str(idx + 1),
            "prompt": prompt
        })
        
    # Save the prompt batches to the output directory
    batches_path = os.path.join(args.output_dir, 'prompt_batches.json')
    with open(batches_path, 'w', encoding='utf-8') as f:
        json.dump(prompt_batches, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {total_students} students. Prompts written to {batches_path}")

if __name__ == '__main__':
    main()
