#!/usr/bin/env python3
"""
测试所有单词的音频可用性
检测百度/有道接口哪些单词会失败
"""

import re
import urllib.request
import urllib.parse
import urllib.error

# 读取单词列表
def extract_words(js_file):
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = r'"en":\s*"([^"]+)"'
    return re.findall(pattern, content)

# 测试百度接口
def test_baidu(word):
    try:
        encoded = urllib.parse.quote(word)
        url = f"https://fanyi.baidu.com/gettts?lan=uk&text={encoded}&spd=3"
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = response.read()
            # 有效音频通常 > 1000 字节且不是 HTML
            if len(data) < 1000 or data[:4] == b'\x3c\x21':
                return False, len(data)
            return True, len(data)
    except Exception as e:
        return False, str(e)

# 测试有道接口
def test_youdao(word):
    try:
        encoded = urllib.parse.quote(word)
        url = f"https://dict.youdao.com/dictvoice?audio={encoded}&type=2"
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = response.read()
            # 有道返回的是 mp3，检查大小
            if len(data) < 1000:
                return False, len(data)
            return True, len(data)
    except Exception as e:
        return False, str(e)

def main():
    words_file = "/Users/ash/Desktop/英语/Ash英语v1.0-2026.3.13小程序版本/words/words.js"
    
    print("正在提取单词列表...")
    words = extract_words(words_file)
    print(f"共 {len(words)} 个单词\n")
    
    baidu_fails = []
    youdao_fails = []
    both_fails = []
    
    print("测试进度:")
    for i, word in enumerate(words, 1):
        baidu_ok, baidu_info = test_baidu(word)
        youdao_ok, youdao_info = test_youdao(word)
        
        if not baidu_ok:
            baidu_fails.append((word, baidu_info))
        if not youdao_ok:
            youdao_fails.append((word, youdao_info))
        if not baidu_ok and not youdao_ok:
            both_fails.append(word)
        
        if i % 100 == 0 or i == len(words):
            print(f"  {i}/{len(words)} 完成")
    
    # 输出结果
    print("\n" + "="*50)
    print(f"百度接口失败: {len(baidu_fails)} 个")
    print(f"有道接口失败: {len(youdao_fails)} 个")
    print(f"两个都失败: {len(both_fails)} 个")
    
    if both_fails:
        print("\n两个接口都失败的单词（需要本地音频）:")
        for w in both_fails:
            print(f"  - {w}")
        
        # 保存到文件
        output_file = "/Users/ash/Desktop/英语/Ash英语v1.0-2026.3.13小程序版本/audio/failed_words.txt"
        with open(output_file, 'w') as f:
            f.write('\n'.join(both_fails))
        print(f"\n已保存到: {output_file}")
    
    if baidu_fails and not both_fails:
        print("\n只有百度失败的单词:")
        for w, info in baidu_fails[:20]:
            print(f"  - {w} ({info})")

if __name__ == "__main__":
    main()
