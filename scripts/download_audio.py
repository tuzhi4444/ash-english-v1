#!/usr/bin/env python3
"""
批量下载单词音频文件
优先使用百度翻译 TTS，失败时回退到有道词典。
"""

import os
import re
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

# 读取单词列表
def extract_words(js_file):
    """从 words.js 提取所有英文单词"""
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配 "en": "单词"
    pattern = r'"en":\s*"([^"]+)"'
    words = re.findall(pattern, content)
    return words

def fetch_audio(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.read(), None
    except Exception as e:
        return None, str(e)


def is_valid_audio(data):
    if not data or len(data) < 1000:
        return False
    if data[:4] == b'\x3c\x21\x44\x4f':  # <!DO
        return False
    if data[:4] == b'<htm' or data[:5].lower() == b'<html':
        return False
    return True


# 下载音频
def download_audio(word, output_dir):
    """下载单个单词的音频"""
    output_path = os.path.join(output_dir, f"{word}.mp3")

    if os.path.exists(output_path):
        return True, "exists"

    encoded = urllib.parse.quote(word)
    sources = [
        ("baidu", f"https://fanyi.baidu.com/gettts?lan=uk&text={encoded}&spd=3"),
        ("youdao", f"https://dict.youdao.com/dictvoice?audio={encoded}&type=2"),
    ]

    last_error = "invalid"
    for source_name, url in sources:
        data, error = fetch_audio(url)
        if error:
            last_error = f"{source_name}:{error}"
            continue
        if not is_valid_audio(data):
            last_error = f"{source_name}:invalid"
            continue
        with open(output_path, 'wb') as f:
            f.write(data)
        return True, source_name

    return False, last_error

def main():
    # 路径配置
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    words_file = project_root / "words" / "words.js"
    output_dir = project_root / "audio"
    
    # 创建输出目录
    output_dir.mkdir(exist_ok=True)
    
    # 提取单词
    print("正在提取单词列表...")
    words = extract_words(words_file)
    print(f"共找到 {len(words)} 个单词")
    
    # 下载音频
    success_count = 0
    fail_count = 0
    exists_count = 0
    failed_words = []
    
    print(f"\n开始下载音频到: {output_dir}")
    print("-" * 50)
    
    for i, word in enumerate(words, 1):
        success, status = download_audio(word, output_dir)
        
        if status == "exists":
            exists_count += 1
        elif success:
            success_count += 1
            print(f"[{i}/{len(words)}] ✓ {word} ({status})")
        else:
            fail_count += 1
            failed_words.append(word)
            print(f"[{i}/{len(words)}] ✗ {word} - {status}")
        
        # 每 10 个暂停一下，避免被封
        if i % 10 == 0:
            time.sleep(0.5)
    
    print("-" * 50)
    print(f"\n下载完成!")
    print(f"  成功: {success_count}")
    print(f"  已存在: {exists_count}")
    print(f"  失败: {fail_count}")
    
    if failed_words:
        print(f"\n失败的单词 ({len(failed_words)}个):")
        for w in failed_words[:20]:  # 只显示前20个
            print(f"  - {w}")
        if len(failed_words) > 20:
            print(f"  ... 还有 {len(failed_words) - 20} 个")
    
    # 统计文件大小
    total_size = sum(f.stat().st_size for f in output_dir.glob("*.mp3"))
    print(f"\n音频文件总大小: {total_size / 1024 / 1024:.2f} MB")
    print(f"平均每个音频: {total_size / len(words) / 1024:.2f} KB")

if __name__ == "__main__":
    main()
