import os
import json
import shutil
import csv
import re
import argparse
import sys
import urllib.request
import urllib.parse
import urllib.error
from classroom_api_client import get_access_token, sync_grade_and_comment

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def extract_seat_and_name(student_name):
    m = re.match(r'^(\d+)(.*)', student_name)
    if m:
        seat = m.group(1)
        name = m.group(2).strip()
        name = re.sub(r'^[_\-\s]+', '', name)
        return seat, name
    m2 = re.search(r'(\d+)$', student_name)
    if m2:
        seat = m2.group(1)
        name = student_name[:-len(seat)].strip()
        return seat, name
    return "", student_name

def extract_seat_from_filename(filename, class_num):
    if not filename:
        return ""
    m = re.search(rf'{class_num}(\d{{2}})', filename)
    if m:
        return m.group(1)
    m2 = re.search(r'\b(\d{2})\b', filename)
    if m2:
        return m2.group(1)
    return ""

def find_match(student_name, grader_list):
    for g in grader_list:
        if g["studentName"] == student_name:
            return g
    for g in grader_list:
        gname = g["studentName"]
        if gname in student_name or student_name in gname:
            return g
    seat_std, _ = extract_seat_and_name(student_name)
    if seat_std:
        for g in grader_list:
            seat_g, _ = extract_seat_and_name(g["studentName"])
            if seat_g == seat_std:
                return g
    return None

def main():
    parser = argparse.ArgumentParser(description="Collate graded results, copy files, write reports, sync to Classroom.")
    parser.add_argument("--results-path", required=True)
    parser.add_argument("--class-num", required=True)
    parser.add_argument("--course-name", required=True)
    parser.add_argument("--course-id", required=True)
    parser.add_argument("--coursework-id", required=True)
    parser.add_argument("--token-path", required=True)
    parser.add_argument("--submissions-dir", required=True)
    parser.add_argument("--target-parent-dir", required=True)
    parser.add_argument("--assignment-type", choices=["timetable", "sticker"], required=True)
    
    args = parser.parse_args()
    
    # 1. Load grader results
    if not os.path.exists(args.results_path):
        print(f"Results file not found: {args.results_path}")
        return
        
    with open(args.results_path, 'r', encoding='utf-8') as f:
        all_results = json.load(f)
        
    # Since results can be a dict (UUID -> list) or a list directly
    grader_list = []
    if isinstance(all_results, dict):
        # We need to collect results that match our class. If there's a subagent mapping, we can use it,
        # but a simpler way is: merge all lists and then match by studentName or filename!
        # This is extremely robust because student names are unique within a class.
        for sender, lst in all_results.items():
            if isinstance(lst, list):
                grader_list.extend(lst)
    elif isinstance(all_results, list):
        grader_list = all_results
        
    # 2. Load download info
    info_path = os.path.join(args.submissions_dir, "download_info.json")
    if not os.path.exists(info_path):
        print(f"Download info not found: {info_path}")
        return
        
    with open(info_path, 'r', encoding='utf-8') as f:
        download_info = json.load(f)
        
    # 3. Setup target directories
    target_dir = os.path.join(args.target_parent_dir, args.course_name)
    os.makedirs(target_dir, exist_ok=True)
    
    # 4. Refresh token
    print("Refreshing Classroom access token...")
    try:
        access_token = get_access_token(args.token_path)
    except Exception as e:
        print(f"Token refresh failed: {e}")
        access_token = None
        
    collated_students = []
    
    print(f"Collating results for {args.course_name}...")
    for item in download_info:
        student_name = item["studentName"]
        filename = item["filename"]
        local_path = item["localPath"]
        sub_id = item["submissionId"]
        
        seat, name = extract_seat_and_name(student_name)
        if not seat:
            seat = extract_seat_from_filename(filename, args.class_num)
            
        grader_match = find_match(student_name, grader_list)
        
        if grader_match:
            score = grader_match["score"]
            comment = grader_match["comment"]
            missing = grader_match.get("missingElements", [])
            has_error = grader_match.get("hasContentErrors", False)
        else:
            print(f"Warning: No grader result found for student: {student_name}")
            score = 0
            comment = "未繳交作業。"
            missing = ["照片", "背景", "插畫"] if args.assignment_type == "sticker" else ["標題", "表格", "插畫", "背景"]
            has_error = False
            
        # Copy file if exists
        copied_filename = ""
        if local_path and os.path.exists(local_path):
            copied_filename = filename
            dest_path = os.path.join(target_dir, filename)
            try:
                shutil.copy2(local_path, dest_path)
            except Exception as e:
                print(f"Failed to copy file {filename}: {e}")
                
        collated_students.append({
            "seat": seat,
            "name": name,
            "fullname": student_name,
            "score": score,
            "comment": comment,
            "missing": missing,
            "has_error": has_error,
            "filename": copied_filename,
            "sub_id": sub_id
        })
        
        # Sync back to Classroom
        if access_token and sub_id:
            try:
                sync_grade_and_comment(access_token, args.course_id, args.coursework_id, sub_id, score, comment)
                print(f"Synced {student_name}: Score={score}")
            except urllib.error.HTTPError as e:
                if e.code == 403:
                    print(f"Warning: 403 Forbidden syncing grade for {student_name}. Coursework may be UI-created.")
                else:
                    print(f"Failed to sync {student_name}: HTTP Error {e.code}")
            except Exception as e:
                print(f"Failed to sync {student_name}: {e}")
                
    # Sort students by seat
    collated_students.sort(key=lambda x: int(x["seat"]) if x["seat"].isdigit() else 999)
    
    # 5. Write CSV & MD Reports
    assignment_title = "非常好色趣味大頭貼" if args.assignment_type == "sticker" else "非常好色-班級課表"
    csv_path = os.path.join(target_dir, f"{assignment_title}評分.csv" if args.assignment_type == "sticker" else f"{assignment_title}.csv")
    md_path = os.path.join(target_dir, f"{assignment_title}評分.md" if args.assignment_type == "sticker" else f"{assignment_title}.md")
    
    # CSV
    fields = ['座號', '姓名', '繳交狀態', '評定分數', '缺失元素', '畫面錯誤' if args.assignment_type == "sticker" else '課表錯誤', '評語與批改明細']
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for s in collated_students:
            status = "已繳交" if s["score"] > 0 or s["filename"] else "未交"
            missing_str = ",".join(s["missing"]) if s["missing"] else "無"
            error_str = "有" if s["has_error"] else "無"
            if status == "未交":
                missing_str = ",".join(["照片", "背景", "插畫"] if args.assignment_type == "sticker" else ["標題", "表格", "插畫", "背景"])
                error_str = "無"
            writer.writerow([
                s['seat'], s['name'], status, s['score'],
                missing_str, error_str, s['comment']
            ])
    print(f"Created CSV report: {csv_path}")
    
    # MD
    submitted_count = sum(1 for s in collated_students if s["score"] > 0 or s["filename"])
    total_count = len(collated_students)
    unsubmitted_count = total_count - submitted_count
    
    md_content = f"# {args.course_name}「{assignment_title}」作業批改報告\n\n"
    md_content += f"目前共有 **{total_count}** 名學生，其中 {submitted_count} 名已繳交作業，{unsubmitted_count} 名未交。\n\n"
    md_content += f"| 座號 | 姓名 | 繳交狀態 | 評定分數 | 缺失元素 | {'畫面錯誤' if args.assignment_type == 'sticker' else '課表錯誤'} | 評語與批改明細 |\n"
    md_content += "| :---: | :--- | :---: | :---: | :---: | :---: | :--- |\n"
    
    for s in collated_students:
        status = "已繳交" if s["score"] > 0 or s["filename"] else "未交"
        missing_str = ",".join(s["missing"]) if s["missing"] else "無"
        error_str = "有" if s["has_error"] else "無"
        if status == "未交":
            missing_str = ",".join(["照片", "背景", "插畫"] if args.assignment_type == "sticker" else ["標題", "表格", "插畫", "背景"])
            error_str = "無"
        md_content += f"| **{s['seat']}** | {s['name']} | {status} | **{s['score']} 分** | {missing_str} | {error_str} | {s['comment']} |\n"
        
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Created Markdown report: {md_path}")
    
    # 6. Clean up temporary dir
    if os.path.exists(args.submissions_dir):
        print(f"Cleaning up temporary directory {args.submissions_dir}...")
        try:
            shutil.rmtree(args.submissions_dir)
        except Exception as e:
            print(f"Warning: Failed to delete temporary directory {args.submissions_dir}: {e}")

if __name__ == '__main__':
    main()
