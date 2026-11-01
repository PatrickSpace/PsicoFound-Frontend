"""Optional offline BPE comparison. pip install tiktoken in a disposable venv.
Input: compareHistory.js JSON on stdin. No OpenAI requests or clinical data.
The current tiktoken release does not map gpt-6-luna: these are named proxies,
not measured provider tokens. Excludes Responses framing/schema/internal tokens.
"""
import json
import sys
import tiktoken

result = json.load(sys.stdin)
result["tokenizerVersion"] = tiktoken.__version__
result["tokenCountsAreProxies"] = True
for row in result["scenarios"]:
    row["contentTokenProxies"] = {}
    for name in ("o200k_base", "cl100k_base"):
        encoding = tiktoken.get_encoding(name)
        row["contentTokenProxies"][name] = {
            "before": sum(len(encoding.encode(text)) for text in row["beforeContent"]),
            "after": sum(len(encoding.encode(text)) for text in row["afterContent"]),
        }
    del row["beforeContent"]
    del row["afterContent"]
print(json.dumps(result, indent=2))
