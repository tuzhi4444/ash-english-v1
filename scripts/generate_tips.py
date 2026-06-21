#!/usr/bin/env python3
"""
批量生成单词记忆技巧，调用 Claude API，输出 words/word_tips.js
用法：
  pip install anthropic
  export ANTHROPIC_API_KEY=sk-ant-...
  python scripts/generate_tips.py
"""

import os
import re
import json
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("请先安装 anthropic 包：pip install anthropic")
    exit(1)

BASE_DIR = Path(__file__).parent.parent
WORDS_JS = BASE_DIR / "words" / "words.js"
TIPS_JS  = BASE_DIR / "words" / "word_tips.js"
PROGRESS = BASE_DIR / "words" / "word_tips_progress.json"

BATCH_SIZE = 30   # 每次 API 请求处理的单词数
SLEEP_SEC  = 0.5  # 请求间隔（秒）


def extract_words(js_file):
    content = js_file.read_text(encoding="utf-8")
    pairs = re.findall(r'"zh":\s*"([^"]+)"[^}]*"en":\s*"([^"]+)"', content)
    return [{"zh": zh, "en": en} for zh, en in pairs]


def build_prompt(words_batch):
    lines = "\n".join(
        f'{i+1}. {w["en"]} ({w["zh"]})' for i, w in enumerate(words_batch)
    )
    return f"""你是一位专业的英语记忆教练。请为以下每个英文单词生成一条简短、实用、有趣的中文记忆技巧。

要求：
- 每条技巧不超过50个字
- 优先使用：词根词缀分析 > 谐音联想 > 形象故事联想 > 场景记忆
- 只输出 JSON 格式，key 为英文单词（小写），value 为记忆技巧字符串
- 不要包含任何额外说明，只输出 JSON

单词列表：
{lines}

请直接输出 JSON："""


def parse_response(text):
    text = text.strip()
    # 去除 markdown 代码块
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("错误：请设置环境变量 ANTHROPIC_API_KEY")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    words = extract_words(WORDS_JS)
    print(f"共 {len(words)} 个单词")

    # 加载已有进度
    tips = {}
    if PROGRESS.exists():
        tips = json.loads(PROGRESS.read_text(encoding="utf-8"))
        print(f"已加载进度：{len(tips)} 条")

    # 过滤出尚未生成的单词
    todo = [w for w in words if w["en"].lower() not in tips]
    print(f"剩余待生成：{len(todo)} 个")

    batches = [todo[i:i+BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    total = len(batches)

    for idx, batch in enumerate(batches, 1):
        print(f"[{idx}/{total}] 处理 {batch[0]['en']} ~ {batch[-1]['en']} ...")
        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2048,
                messages=[{"role": "user", "content": build_prompt(batch)}]
            )
            result = parse_response(msg.content[0].text)
            for k, v in result.items():
                tips[k.lower()] = v
        except Exception as e:
            print(f"  !! 批次出错：{e}，跳过此批次")

        # 每批次保存进度
        PROGRESS.write_text(json.dumps(tips, ensure_ascii=False, indent=2), encoding="utf-8")

        if idx < total:
            time.sleep(SLEEP_SEC)

    # 写入最终 JS 文件
    js_lines = ["// 单词记忆技巧（由 scripts/generate_tips.py 自动生成）",
                "const WORD_TIPS = {"]
    for w in words:
        key = w["en"].lower()
        tip = tips.get(key, "")
        if tip:
            escaped = tip.replace("\\", "\\\\").replace('"', '\\"')
            js_lines.append(f'  "{key}": "{escaped}",')
    js_lines.append("};")
    js_lines.append("module.exports = WORD_TIPS;")
    TIPS_JS.write_text("\n".join(js_lines) + "\n", encoding="utf-8")

    print(f"\n完成！已生成 {len([w for w in words if w['en'].lower() in tips])} 条记忆技巧")
    print(f"输出文件：{TIPS_JS}")
    # 清理进度文件
    if PROGRESS.exists():
        PROGRESS.unlink()


if __name__ == "__main__":
    main()
