#!/usr/bin/env python3
"""
全自动批量生成单词记忆技巧（规则引擎 + 模板）
不用 API，基于词根词缀拆分 + 谐音联想 + 场景模板
"""
import re, json
import os, sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_JS = os.path.join(BASE_DIR, "words", "words.js")
TIPS_JS  = os.path.join(BASE_DIR, "words", "word_tips.js")

# ========== 词根词缀词典 ==========
PREFIX_ROOT = {
    "re": "重复/再次",
    "un": "不/反",
    "in": "不/进入",
    "im": "不/进入",
    "dis": "不/分开",
    "pre": "在…之前",
    "ex": "向外/前任",
    "sub": "在…下面",
    "super": "超级/在上",
    "inter": "在…之间",
    "trans": "跨越/转移",
    "mis": "错误",
    "over": "超过/越过",
    "under": "在…下面/不足",
    "out": "超出/向外",
    "co": "共同",
    "com": "共同",
    "con": "共同",
    "de": "向下/去除",
    "pro": "向前/支持",
    "anti": "反对",
    "auto": "自己/自动",
    "bi": "双/两",
    "tri": "三",
    "multi": "多",
    "semi": "半",
    "mini": "微型",
    "micro": "微小",
    "tele": "远程",
    "mono": "单一",
    "poly": "多",
    "en": "使…成为",
    "em": "使…进入",
    "be": "使/在",
    "per": "贯穿/完全",
    "ab": "离开",
    "ad": "向/增加",
    "ob": "反对/朝向",
    "se": "分开",
    "circum": "环绕",
    "contra": "反对",
}

SUFFIX_ROOT = {
    "tion": "名词(动作/状态)",
    "sion": "名词(动作/状态)",
    "ment": "名词(结果/手段)",
    "ness": "名词(性质/状态)",
    "ity": "名词(性质)",
    "ance": "名词(状态)",
    "ence": "名词(状态)",
    "able": "可…的",
    "ible": "可…的",
    "ful": "充满…的",
    "less": "没有…的",
    "ous": "充满…的",
    "ive": "有…倾向的",
    "al": "…的(形容词)",
    "ic": "…的",
    "ly": "…地(副词)",
    "er": "…的人/比较级",
    "or": "…的人/物",
    "ist": "…者/专家",
    "ee": "被…的人",
    "ing": "正在…",
    "ed": "已…的",
    "ize": "使…化",
    "ise": "使…化",
    "ify": "使…化",
    "ate": "使…/有…性质",
    "ward": "向…方向",
    "wards": "向…方向",
    "ship": "关系/状态/技能",
    "dom": "领域/状态",
    "th": "第…/状态",
    "en": "使…/由…制成",
    "like": "像…的",
    "ish": "有点…的/…语",
}

ROOT_WORDS = {
    "act": "行动",
    "dict": "说",
    "duct": "引导",
    "ject": "投掷",
    "port": "携带/港口",
    "rupt": "断裂",
    "struct": "建造",
    "vis": "看",
    "vid": "看",
    "spect": "看",
    "scrib": "写",
    "script": "写",
    "sens": "感觉",
    "sent": "感觉/发送",
    "mit": "发送",
    "miss": "发送/错过",
    "ced": "走",
    "cess": "走",
    "grad": "走/步",
    "gress": "走/步",
    "fer": "携带/承受",
    "tain": "持有",
    "ten": "持有",
    "tend": "伸展/倾向",
    "tens": "伸展",
    "pend": "悬挂/支付",
    "pens": "悬挂/支付",
    "pos": "放置",
    "pon": "放置",
    "form": "形状",
    "press": "压",
    "tract": "拉/拖",
    "vert": "转",
    "vers": "转",
    "voc": "声音/呼喊",
    "vok": "声音/呼喊",
    "log": "说话/学问",
    "graph": "写/画",
    "phon": "声音",
    "chron": "时间",
    "path": "感受/路径",
    "psych": "心理/灵魂",
    "bio": "生命",
    "geo": "地球",
    "therm": "热",
    "hydr": "水",
    "aqua": "水",
    "aero": "空气/飞行",
    "astro": "星星",
    "star": "星星",
    "cred": "相信",
    "fid": "信任",
    "fin": "结束/界限",
    "flu": "流动",
    "gen": "产生/种族",
    "man": "手",
    "ped": "脚",
    "mob": "移动",
    "mot": "移动",
    "mov": "移动",
    "nat": "出生",
    "nov": "新",
    "ord": "顺序",
    "reg": "规则/统治",
    "sci": "知道",
    "sign": "标记",
    "simil": "相似",
    "sol": "单独/太阳",
    "temp": "时间",
    "uni": "一/统一",
    "ven": "来",
    "vent": "来",
    "volv": "卷/转",
    "volut": "卷/转",
    "cap": "头/抓",
    "cept": "拿/取",
    "ceive": "拿/取",
    "cip": "拿",
    "fac": "做/脸",
    "fact": "做/事实",
    "fic": "做",
    "fit": "做",
    "fort": "强/力量",
    "grat": "感谢/愉快",
    "habit": "居住/习惯",
    "labor": "劳动",
    "leg": "法律/选择",
    "liber": "自由",
    "liter": "文字",
    "loc": "地方",
    "lumin": "光",
    "magn": "大",
    "mand": "命令",
    "memor": "记忆",
    "min": "小",
    "norm": "规则/正常",
    "oper": "工作",
    "part": "部分/分开",
    "pass": "通过",
    "pel": "推动",
    "puls": "推动",
    "rect": "直/正确",
    "serv": "服务/保存",
    "sist": "站立",
    "soci": "同伴/社会",
    "son": "声音",
    "spir": "呼吸",
    "tang": "接触",
    "tact": "接触",
    "termin": "终点",
    "urb": "城市",
    "val": "价值/强",
    "vit": "生命",
    "viv": "生活",
    "vocab": "词汇",
    "vol": "意愿/意志",
}

CHINESE_RHYME = {
    "ba": "爸",
    "be": "必",
    "bi": "比",
    "bo": "波",
    "bu": "不",
    "ca": "卡",
    "ce": "丝",
    "ci": "西",
    "co": "扣",
    "cu": "库",
    "da": "大",
    "de": "的",
    "di": "地",
    "do": "都",
    "du": "度",
    "fa": "发",
    "fe": "飞",
    "fi": "飞",
    "fo": "佛",
    "fu": "服",
    "ga": "嘎",
    "ge": "给",
    "gi": "吉",
    "go": "狗",
    "gu": "咕",
    "ha": "哈",
    "he": "喝",
    "hi": "嗨",
    "ho": "火",
    "hu": "呼",
    "ja": "夹",
    "je": "杰",
    "ji": "吉",
    "jo": "乔",
    "ju": "巨",
    "ka": "卡",
    "ke": "可",
    "ki": "奇",
    "ko": "扣",
    "ku": "库",
    "la": "拉",
    "le": "了",
    "li": "里",
    "lo": "咯",
    "lu": "路",
    "ma": "妈",
    "me": "么",
    "mi": "米",
    "mo": "莫",
    "mu": "木",
    "na": "那",
    "ne": "呢",
    "ni": "你",
    "no": "诺",
    "nu": "努",
    "pa": "啪",
    "pe": "佩",
    "pi": "皮",
    "po": "破",
    "pu": "扑",
    "qu": "趣",
    "ra": "拉",
    "re": "瑞",
    "ri": "日",
    "ro": "若",
    "ru": "入",
    "sa": "撒",
    "se": "色",
    "si": "丝",
    "so": "搜",
    "su": "苏",
    "ta": "塔",
    "te": "特",
    "ti": "提",
    "to": "头",
    "tu": "图",
    "va": "哇",
    "ve": "维",
    "vi": "维",
    "vo": "沃",
    "wa": "哇",
    "we": "微",
    "wi": "威",
    "wo": "我",
    "ya": "呀",
    "ye": "耶",
    "yi": "一",
    "yo": "哟",
    "yu": "玉",
    "za": "砸",
    "ze": "则",
    "zi": "子",
    "zo": "走",
    "zu": "组",
}

# ========== 生成函数 ==========

def split_word(word):
    """尝试用已知词根词缀拆分单词"""
    w = word.lower()
    candidates = []

    # 前缀匹配
    used_prefix = ""
    for pre in sorted(PREFIX_ROOT.keys(), key=lambda x: -len(x)):
        if w.startswith(pre) and len(pre) >= 2 and len(w) - len(pre) >= 3:
            used_prefix = pre
            rest = w[len(pre):]
            candidates.append(("prefix", pre, rest))
            break

    # 后缀匹配
    used_suffix = ""
    for suf in sorted(SUFFIX_ROOT.keys(), key=lambda x: -len(x)):
        if w.endswith(suf) and len(suf) >= 2 and len(w) - len(suf) >= 2:
            used_suffix = suf
            root_part = w[:-len(suf)]
            candidates.append(("suffix", root_part, suf))
            break

    # 词根匹配（在中间）
    for root in sorted(ROOT_WORDS.keys(), key=lambda x: -len(x)):
        if root in w and root not in (used_prefix, used_suffix) and len(root) >= 3:
            idx = w.index(root)
            before = w[:idx]
            after = w[idx+len(root):]
            if before or after:
                candidates.append(("root", before, root, after, ROOT_WORDS[root]))
                break

    return candidates


def make_rhyme_hint(word, zh):
    """谐音联想"""
    w = word.lower()
    
    # 尝试找到最佳的中文谐音
    best = ""
    for i in range(len(w) - 1):
        chunk = w[i:i+2]
        if chunk in CHINESE_RHYME:
            best += CHINESE_RHYME[chunk]
    
    if len(best) >= 2:
        return f"谐音'{best}'——想象{best}和「{zh}」的关联场景来记忆。"
    
    # 全词谐音
    return f"反复朗读{word}，感受音韵和「{zh}」之间的联想。"


def make_short_word_tip(word, zh):
    """短单词特殊处理"""
    w = word.lower()
    lw = len(w)
    
    if lw <= 3:
        # 3字母以下用音形联想
        patterns = {
            "add": "add(加)像是两个d手拉手加在一起。",
            "age": "age谐音'爱击'——随着年龄(age)增长爱打击别人。",
            "ago": "ago三个字母很简单，a(一个) go(走)——以前(ago)走了的。",
            "air": "air谐音'爱尔'——空气(air)清新如爱尔兰的草原。",
            "all": "all三个字母就记'all in'——全(all)押上去！",
        }
        if w in patterns:
            return patterns[w]
        return f"{word}只有{lw}个字母，想想它和「{zh}」有什么联系？"
    
    return None


def make_compound_tip(word, zh):
    """拆分复合词"""
    w = word.lower()
    
    common_splits = {
        "airport": ("air(空气/航空)", "port(港口)"),
        "anybody": ("any(任何)", "body(人/身体)"),
        "anything": ("any(任何)", "thing(事情)"),
        "anywhere": ("any(任何)", "where(哪里)"),
        "backpack": ("back(后面)", "pack(背包/打包)"),
        "basketball": ("basket(篮子)", "ball(球)"),
        "bathroom": ("bath(洗澡)", "room(房间)"),
        "bedroom": ("bed(床)", "room(房间)"),
        "birthday": ("birth(出生)", "day(天)"),
        "blackboard": ("black(黑色)", "board(板)"),
        "bookstore": ("book(书)", "store(商店)"),
        "breakfast": ("break(打破)", "fast(禁食)"),
        "butterfly": ("butter(黄油)", "fly(飞)"),
        "classroom": ("class(课堂)", "room(房间)"),
        "classmate": ("class(班级)", "mate(伙伴)"),
        "cupboard": ("cup(杯子)", "board(板)"),
        "doorbell": ("door(门)", "bell(铃)"),
        "download": ("down(向下)", "load(装载)"),
        "everybody": ("every(每个)", "body(人)"),
        "everyone": ("every(每个)", "one(一个)"),
        "everything": ("every(每个)", "thing(事情)"),
        "everywhere": ("every(每个)", "where(哪里)"),
        "firefighter": ("fire(火)", "fighter(战士)"),
        "fireplace": ("fire(火)", "place(地方)"),
        "football": ("foot(脚)", "ball(球)"),
        "forever": ("for(为了)", "ever(永远)"),
        "grandfather": ("grand(宏大)", "father(父亲)"),
        "grandmother": ("grand(宏大)", "mother(母亲)"),
        "haircut": ("hair(头发)", "cut(剪)"),
        "handbag": ("hand(手)", "bag(包)"),
        "headache": ("head(头)", "ache(疼痛)"),
        "highway": ("high(高)", "way(路)"),
        "homework": ("home(家)", "work(工作)"),
        "housewife": ("house(房子)", "wife(妻子)"),
        "inside": ("in(在里)", "side(边)"),
        "into": ("in(进)", "to(到)"),
        "keyboard": ("key(键)", "board(板)"),
        "landlord": ("land(土地)", "lord(领主)"),
        "lifetime": ("life(生命)", "time(时间)"),
        "living": ("live(生活)", "ing(进行中)"),
        "mailbox": ("mail(邮件)", "box(盒子)"),
        "maybe": ("may(可能)", "be(是)"),
        "meanwhile": ("mean(意指)", "while(当…时)"),
        "moonlight": ("moon(月亮)", "light(光)"),
        "nobody": ("no(没有)", "body(人)"),
        "notebook": ("note(笔记)", "book(书)"),
        "nothing": ("no(不)", "thing(事情)"),
        "nowhere": ("no(不)", "where(哪里)"),
        "outdoor": ("out(外面)", "door(门)"),
        "outside": ("out(外)", "side(边)"),
        "overcoat": ("over(上面)", "coat(外套)"),
        "password": ("pass(通过)", "word(词)"),
        "playground": ("play(玩)", "ground(地面)"),
        "policeman": ("police(警察)", "man(人)"),
        "rainbow": ("rain(雨)", "bow(弓)"),
        "raincoat": ("rain(雨)", "coat(外套)"),
        "seafood": ("sea(海)", "food(食物)"),
        "shopkeeper": ("shop(商店)", "keeper(看守)"),
        "snowman": ("snow(雪)", "man(人)"),
        "software": ("soft(软)", "ware(物品)"),
        "somebody": ("some(某个)", "body(人)"),
        "someone": ("some(某个)", "one(一个人)"),
        "something": ("some(某)", "thing(事)"),
        "sometimes": ("some(某)", "times(时候)"),
        "somewhere": ("some(某)", "where(哪)"),
        "spaceship": ("space(太空)", "ship(船)"),
        "strawberry": ("straw(草)", "berry(浆果)"),
        "sunlight": ("sun(太阳)", "light(光)"),
        "sunrise": ("sun(太阳)", "rise(升起)"),
        "sunset": ("sun(太阳)", "set(落下)"),
        "supermarket": ("super(超级)", "market(市场)"),
        "teapot": ("tea(茶)", "pot(壶)"),
        "textbook": ("text(文本)", "book(书)"),
        "toothache": ("tooth(牙)", "ache(痛)"),
        "understand": ("under(在下)", "stand(站)"),
        "upstairs": ("up(上)", "stairs(楼梯)"),
        "volleyball": ("volley(截击)", "ball(球)"),
        "waterfall": ("water(水)", "fall(落下)"),
        "weekend": ("week(周)", "end(结尾)"),
        "without": ("with(有)", "out(没有/外)"),
        "workplace": ("work(工作)", "place(地方)"),
        "yourself": ("your(你的)", "self(自己)"),
    }
    
    if w in common_splits:
        a, b = common_splits[w]
        return f"复合词：{a.replace(chr(40),'(').replace(chr(41),')')}+{b.replace(chr(40),'(').replace(chr(41),')')} → {zh}"
    
    return None


def make_affix_tip(word, zh):
    """基于词根词缀生成技巧"""
    candidates = split_word(word)
    if not candidates:
        return None
    
    cat, *parts = candidates[0]
    
    if cat == "prefix":
        pre, rest = parts
        meaning = PREFIX_ROOT[pre]
        return f"词缀: {pre}({meaning})+{rest} → 「{zh}」的意思就藏在词缀里。"
    
    if cat == "suffix":
        root_part, suf = parts
        meaning = SUFFIX_ROOT[suf]
        if root_part:
            return f"词缀: {root_part}+{suf}({meaning}) → 后缀{suf}提示这是「{zh}」相关的词。"
    
    if cat == "root":
        before, root, after, meaning = parts
        bs = f"{before}+" if before else ""
        afs = f"+{after}" if after else ""
        return f"词根: {bs}{root}({meaning}){afs} → 词根{root}表示「{meaning}」，联想理解「{zh}」。"
    
    return None


def make_semantic_tip(word, zh):
    """基于语义的联想"""
    w = word.lower()
    lw = len(w)
    
    # 水果/食物
    if "果" in zh or "莓" in zh or "桃" in zh or "蕉" in zh or "瓜" in zh:
        return f"想象吃{zh}时念{word}，把味道和单词绑定记忆。"
    
    # 动物
    if "鱼" in zh or "鸟" in zh or "虫" in zh or "兽" in zh or "马" in zh or "牛" in zh or "羊" in zh or "猪" in zh or "狗" in zh or "猫" in zh or "鸡" in zh or "鸭" in zh or "鹅" in zh:
        return f"想象{zh}的样子，边看边念{word}，视觉绑定记忆法。"
    
    # 动作
    if len(zh) == 1 and lw <= 5:
        return f"做「{zh}」这个动作时默念{word}，用肌肉记忆辅助单词记忆。"
    
    # 颜色
    if "色" in zh or zh in ["红","黄","蓝","绿","白","黑","紫","粉","金","银"]:
        return f"看到{zh}的东西就想{word}，颜色绑定记单词。"
    
    # 数字
    if any(d in zh for d in "一二三四五六七八九十百千万"):
        return f"数到{zh}时就想{word}，数字绑定记单词。"
    
    # 抽象/情感
    if "感" in zh or "情" in zh or "心" in zh or "爱" in zh or "恨" in zh:
        return f"体会「{zh}」这种感觉时默念{word}，情感绑定记忆法。"
    
    # 短词通用
    if lw <= 5:
        return f"{word}({zh})——小而重要，每天见面3次，一周就记住。"
    
    # 中等长度
    if lw <= 7:
        return f"把{word}拆开音节读几遍，感受每个音和「{zh}」的联系。"
    
    # 长词
    return f"用音节分段法记{word}：每段2-3个字母一组，分块记忆「{zh}」。"
    

def generate_tip(word, zh):
    """为一个单词生成记忆技巧，按优先级尝试多种方法"""
    w = word.lower()
    
    # 0. 已有的不重复生成
    # (caller handles this)
    
    # 1. 复合词拆分 (最高效)
    tip = make_compound_tip(word, zh)
    if tip:
        return tip
    
    # 2. 词根词缀分析 (最科学)
    tip = make_affix_tip(word, zh)
    if tip:
        return tip
    
    # 3. 短词特殊处理
    if len(w) <= 4:
        tip = make_short_word_tip(word, zh)
        if tip:
            return tip
    
    # 4. 谐音联想
    tip = make_rhyme_hint(word, zh)
    if tip:
        return tip
    
    # 5. 语义联想兜底
    return make_semantic_tip(word, zh)


# ========== 主入口 ==========

def main():
    # 读取词库
    with open(WORDS_JS, "r", encoding="utf-8") as f:
        words_js_content = f.read()
    
    words = re.findall(r'"zh":\s*"([^"]+)"[^}]*"en":\s*"([^"]+)"', words_js_content)
    print(f"词库共 {len(words)} 个单词")
    
    # 读取已有 tips
    existing = {}
    if os.path.exists(TIPS_JS):
        with open(TIPS_JS, "r", encoding="utf-8") as f:
            tips_content = f.read()
        # 保留已有内容
        for line in tips_content.split("\n"):
            m = re.match(r'\s*"([a-z]+)":\s*"(.+)",?\s*$', line)
            if m:
                existing[m.group(1)] = m.group(2)
    print(f"已有 {len(existing)} 条记忆技巧")
    
    # 合并新生成
    new_count = 0
    for zh, en in words:
        key = en.lower()
        if key in existing and existing[key].strip():
            continue
        tip = generate_tip(en, zh)
        existing[key] = tip
        new_count += 1
        if new_count % 100 == 0:
            print(f"  已生成 {new_count} 条...")
    
    print(f"新生成 {new_count} 条记忆技巧")
    print(f"总计 {len(existing)} 条")
    
    # 写入 word_tips.js
    lines = [
        "// 单词记忆技巧（由 scripts/generate_tips_auto.py 自动生成，包含规则引擎+模板）",
        "const WORD_TIPS = {",
    ]
    
    for zh, en in words:
        key = en.lower()
        tip = existing.get(key, "")
        escaped = tip.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{key}": "{escaped}",')
    
    lines.append("};")
    lines.append("module.exports = WORD_TIPS;")
    lines.append("")
    
    with open(TIPS_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    
    print(f"\n✅ 输出文件: {TIPS_JS}")
    
    # 同时生成 H5 版本兼容的 JSON
    tips_json_path = os.path.join(BASE_DIR, "words", "word_tips.json")
    with open(tips_json_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"✅ 同时输出 H5 JSON: {tips_json_path}")


if __name__ == "__main__":
    main()