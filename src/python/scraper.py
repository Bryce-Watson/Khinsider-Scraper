import requests
import json
import os
import re
import sys
from bs4 import BeautifulSoup

linkHeader = "https://nu.vgmtreasurechest.com/soundtracks/"

def send_message(message_type, data):
    """Send JSON message to Node.js"""
    message = json.dumps({"type": message_type, "data": data})
    print(message, flush=True)
    sys.stdout.flush()

def get_webpage_content(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        send_message("error", f"Error fetching webpage: {e}")
        return None

def extract_scripts(html_content):
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        scripts = soup.find_all('script')
        return [str(script) for script in scripts]
    return []

def find_eval_script(scripts):
    """Find the script containing eval(function("""
    for i, script in enumerate(scripts, 1):
        if 'eval(function(' in script:
            return script
    return None

def extract_url_track_names(website_url):
    html_content = get_webpage_content(website_url)
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        trackNames = soup.find_all(class_='clickable-row', align=False)
        return [re.search(r"/([^/]*).mp3$",name.find('a').get('href')).group(1) for name in trackNames if name.find('a')]
    return []

def extract_track_names(website_url):
    html_content = get_webpage_content(website_url)
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        trackNames = soup.find_all(class_='clickable-row', align=False)
        return [name.text.strip() for name in trackNames]
    return []

def extract_track_codes(script_content):
    """Extract track codes after 'audioplayerAction', counting backwards from the end"""
    # Find the string that gets split by '|'
    match = re.search(r"'([^']+)'\.split\('\|'\)", script_content)

    if not match:
        print("Could not find the split string pattern")
        return {}

    # Get the full string and split by |
    data_string = match.group(1)
    parts = data_string.split('|')

    # Find the index of 'audioplayerAction'
    try:
        action_index = parts.index('audioplayerAction')
    except ValueError:
        print("Could not find 'audioplayerAction' in the data")
        return {}

    # Only take parts after 'audioplayerAction'
    parts_after = "|".join(parts[action_index:])

    # Look for codes that match the criteria
    # Pattern: 8 lowercase letters, followed by optional pipes, then 7 digits
    pattern = r"\|([a-z]+)\|+(?=(?:[a-z]+\|)?\d+\|)"
    matches = re.findall(pattern, parts_after)

    # Extract just the codes (first group from each match)

    return matches[::-1]

def download_track(website_name, track_code, track_name, output_dir, realFileName):
    websiteLink = f"{linkHeader}{website_name}/{track_code}/{track_name.replace("%25", "%")}.mp3"
    
    try:
        response = requests.get(websiteLink, timeout=30)
        
        if response.status_code != 200:
            return None
        else:
            filepath = os.path.join(output_dir, f"{realFileName}.mp3")
            with open(filepath, "wb") as f:
                f.write(response.content)
            return f"{realFileName}.mp3"
    except Exception as e:
        send_message("warning", f"Error downloading {realFileName}: {e}")
        return None

def get_album_info(website_url):
    """Get track list without downloading"""
    html_content = get_webpage_content(website_url)

    if not html_content:
        send_message("error", "Failed to fetch album page")
        return None

    track_names = extract_track_names(website_url)
    websiteName = website_url.replace("https://downloads.khinsider.com/game-soundtracks/album/", "")

    tracks = []
    for i, name in enumerate(track_names):
        tracks.append({
            "id": str(i),
            "title": name
        })

    return {
        "albumName": websiteName,
        "tracks": tracks
    }

def download_selected_tracks(website_url, track_indices, output_dir=None):
    """Download only selected tracks by their indices"""
    html_content = get_webpage_content(website_url)
    websiteName = website_url.replace("https://downloads.khinsider.com/game-soundtracks/album/", "")
    
    if output_dir is None:
        output_dir = websiteName
    
    if html_content:
        script_elements = extract_scripts(html_content)
        eval_script = find_eval_script(script_elements)
        
        if eval_script:
            track_codes = extract_track_codes(eval_script)
            all_track_url_names = extract_url_track_names(website_url)
            all_track_names = extract_track_names(website_url)

            
            if not track_codes:
                send_message("error", "No track codes found")
                return
            
            # Filter to only selected tracks
            track_url_names = [all_track_url_names[i] for i in track_indices if i < len(all_track_url_names)]
            track_names = [all_track_names[i] for i in track_indices if i < len(all_track_names)]
            
            if not track_url_names:
                send_message("error", "No valid tracks selected")
                return
            
            os.makedirs(output_dir, exist_ok=True)

            if len(track_names) != len(track_url_names) or len(track_url_names) != len(track_codes):
                send_message("error", "Track names, track URLs, and track codes do not match")
                return

            totalIterations = len(track_names)
            
            for index in range(totalIterations): # could be any of the three
                    
                trackName = download_track(websiteName, track_codes[index], track_url_names[index], output_dir, track_names[index])

                send_message("progress", {
                    "current": index + 1,
                    "total": totalIterations,
                    "fileName": trackName,
                })

        else:
            send_message("error", "Could not find eval script in page")
    else:
        send_message("error", "Failed to fetch HTML content")

if __name__ == "__main__":
    extract_track_codes(find_eval_script(extract_scripts(get_webpage_content("https://downloads.khinsider.com/game-soundtracks/album/five-nights-at-freddy-s-fnaf"))))
    if len(sys.argv) < 2:
        send_message("error", "No command provided")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "get_info":
        if len(sys.argv) < 3:
            send_message("error", "No URL provided")
            sys.exit(1)
        url = sys.argv[2]
        info = get_album_info(url)
        if info:
            send_message("album_info", info)
    
    elif command == "download_selected":
        if len(sys.argv) < 4:
            send_message("error", "Missing arguments")
            sys.exit(1)
        url = sys.argv[2]
        indices = json.loads(sys.argv[3])
        output_dir = sys.argv[4] if len(sys.argv) > 4 else None
        download_selected_tracks(url, indices, output_dir)
    
    else:
        send_message("error", f"Unknown command: {command}")
        sys.exit(1)