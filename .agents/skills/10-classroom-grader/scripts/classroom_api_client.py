import json
import urllib.request
import urllib.parse
import urllib.error

def get_access_token(token_path):
    with open(token_path, 'r', encoding='utf-8') as f:
        creds = json.load(f)
    
    data = urllib.parse.urlencode({
        'client_id': creds['client_id'],
        'client_secret': creds['client_secret'],
        'refresh_token': creds['refresh_token'],
        'grant_type': 'refresh_token'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=data,
        method='POST'
    )
    
    with urllib.request.urlopen(req) as res:
        response_data = json.loads(res.read().decode('utf-8'))
        return response_data['access_token']

def download_drive_file(access_token, file_id, output_path):
    url = f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media'
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {access_token}')
    with urllib.request.urlopen(req) as res:
        with open(output_path, 'wb') as f:
            f.write(res.read())

def fetch_submissions(access_token, course_id, coursework_id):
    # Fetch students roster to map IDs to names
    roster_url = f'https://classroom.googleapis.com/v1/courses/{course_id}/students'
    req = urllib.request.Request(roster_url)
    req.add_header('Authorization', f'Bearer {access_token}')
    
    students_map = {}
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            for s in data.get('students', []):
                students_map[s['userId']] = s['profile']['name']['fullName']
    except Exception as e:
        print("Roster fetch warning:", e)

    # Fetch submissions
    sub_url = f'https://classroom.googleapis.com/v1/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions'
    req = urllib.request.Request(sub_url)
    req.add_header('Authorization', f'Bearer {access_token}')
    
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        return data.get('studentSubmissions', []), students_map

def sync_grade_and_comment(access_token, course_id, coursework_id, submission_id, score, comment):
    # 1. Update draft grade
    patch_url = f'https://classroom.googleapis.com/v1/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions/{submission_id}?updateMask=draftGrade'
    patch_data = json.dumps({
        "draftGrade": score
    }).encode('utf-8')
    
    req = urllib.request.Request(patch_url, data=patch_data, method='PATCH')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')
    
    with urllib.request.urlopen(req) as res:
        pass
        
    # 2. Add private comment
    comment_url = f'https://classroom.googleapis.com/v1/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions/{submission_id}/comments'
    comment_data = json.dumps({
        "text": comment
    }).encode('utf-8')
    
    req2 = urllib.request.Request(comment_url, data=comment_data, method='POST')
    req2.add_header('Authorization', f'Bearer {access_token}')
    req2.add_header('Content-Type', 'application/json')
    
    with urllib.request.urlopen(req2) as res2:
        pass
