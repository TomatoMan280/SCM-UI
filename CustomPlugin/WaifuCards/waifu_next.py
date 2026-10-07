import urllib.request, json
try:
    html = urllib.request.urlopen(urllib.request.Request('https://waifucards.app/cards', headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    s = '<script id="__NEXT_DATA__" type="application/json">'
    start = html.find(s)
    end = html.find('</script>', start)
    data = json.loads(html[start+len(s):end])
    print('16521' in json.dumps(data))
    
    # Let's save the data to a file for inspection
    with open('waifu_data.json', 'w') as f:
        json.dump(data, f, indent=2)
except Exception as e:
    print(e)
