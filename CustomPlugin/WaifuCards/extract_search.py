import re
html = open('waifu_cards.html', 'r', encoding='utf-8').read()
m = re.search(r'searchGlobal.*?\{', html, re.DOTALL)
if m:
    print(html[m.start():m.start()+1000].encode('ascii', 'ignore').decode())
else:
    print("Not found")
