import re
html = open('waifu_cards.html', 'r', encoding='utf-8').read()
links = re.findall(r'href=[\"\'](/card[^\"\']*)[\"\']', html)
print(set(links))

# Let's also search for any API endpoint strings
api_endpoints = re.findall(r'[\"\'](/?api/[^\"\']*)[\"\']', html)
v2_endpoints = re.findall(r'[\"\'](/?v2/[^\"\']*)[\"\']', html)
print("APIs:", set(api_endpoints))
print("V2s:", set(v2_endpoints))

# Also look for any search string parameter in axios
search_params = re.findall(r'search_type=.*?[\"\']', html)
print("Search Params:", set(search_params))
