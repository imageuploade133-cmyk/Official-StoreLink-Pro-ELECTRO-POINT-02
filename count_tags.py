import re

def count_tags(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
        
    div_opens = len(re.findall(r'<div', content))
    div_closes = len(re.findall(r'</div', content))
    
    card_opens = len(re.findall(r'<Card', content))
    card_closes = len(re.findall(r'</Card', content))
    
    card_content_opens = len(re.findall(r'<CardContent', content))
    card_content_closes = len(re.findall(r'</CardContent', content))
    
    print(f"Divs: {div_opens} open, {div_closes} close")
    print(f"Cards: {card_opens} open, {card_closes} close")
    print(f"CardContents: {card_content_opens} open, {card_content_closes} close")

if __name__ == "__main__":
    count_tags('src/components/inventory/ProductVariantsManager.tsx')
