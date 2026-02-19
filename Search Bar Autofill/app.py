from flask import Flask, render_template, request
import requests

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/autocomplete')
def autocomplete():
    query = request.args.get('q', '')
    suggestions = []
    
    if len(query) > 2:
        url = f"https://photon.komoot.io/api/?q={query}&limit=10&lat=37.0902&lon=-95.7129"
        headers = {'User-Agent': 'UpCode-Project/1.0'}
        
        try:
            response = requests.get(url, headers=headers)
            data = response.json()
            for feature in data.get('features', []):
                p = feature.get('properties', {})
                
                if p.get('countrycode') == 'US':
                    num = p.get('housenumber', '')
                    street = p.get('street', '')
                    city = p.get('city', '')
                    state = p.get('state', '')
                    
                    main_addr = f"{num} {street}".strip()

                    if not main_addr:
                        main_addr = p.get('name', '')

                    parts = [main_addr, city, state]
                    full = ", ".join([str(part) for part in parts if part])
                    
                    coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                    
                    if full:
                        suggestions.append({
                            "display": full,
                            "lat": coords[1],
                            "lon": coords[0]
                        })
        except:
            pass
            
    return {"results": suggestions}

if __name__ == '__main__':
    app.run(debug=True)