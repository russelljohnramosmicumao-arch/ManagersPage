const MenuStore = {
 key: 'kbr_menu_v1',
 validate(items) {
  if (!Array.isArray(items) || !items.length || items.length > 1000) throw new Error('Menu must contain 1–1000 items.');
  const seen=new Set();
  return items.map(p=>{
   if (!p || typeof p.name!=='string' || !p.name.trim() || typeof p.category!=='string' || !p.category.trim()) throw new Error('Every item needs a name and category.');
   const key=p.category.trim().toLowerCase()+'|'+p.name.trim().toLowerCase();
   if(seen.has(key)) throw new Error('Duplicate item in category: '+p.name); seen.add(key);
   function check(sizes,prices){if(!Array.isArray(sizes)||!sizes.length||sizes.length>30||!Array.isArray(prices)||sizes.length!==prices.length||sizes.some(x=>typeof x!=='string'||!x.trim())||prices.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>1000000))throw new Error('Each size needs a valid price.');}
   check(p.sizes,p.prices); if(p.premium)check(p.premiumSizes,p.premium);
   const image=p.image||'';
   if(typeof image!=='string'||(image && !/^(images\/|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(image)))throw new Error('Use an images/ path, an HTTP photo URL, or an uploaded photo.');
   return {productId:typeof p.productId==='string'&&p.productId?p.productId:crypto.randomUUID(),name:p.name.trim(),category:p.category.trim(),sizes:p.sizes.map(x=>x.trim()),prices:p.prices,premium:p.premium||null,premiumSizes:p.premium?p.premiumSizes.map(x=>x.trim()):null,availability:['available','not-available','out-of-stock'].includes(p.availability)?p.availability:'available',food:!!p.food,pricePending:!!p.pricePending,image};
  });
 },
 load(){try{
  const raw=localStorage.getItem(this.key);
  const stored=this.validate(raw?JSON.parse(raw):DEFAULT_PRODUCTS);
  stored.forEach(item=>{if(['Nom Chompoo','Cha Yen'].includes(item.name)&&item.category==='Thai Drinks')item.category='Specials';});
  if(localStorage.getItem('kbr_menu_cloud_authoritative_v1'))return stored;
  const items=this.upgrade(stored);
  const revision='kbr_icecream_prices_20261005';
  if(!localStorage.getItem(revision)){
   DEFAULT_PRODUCTS.filter(p=>p.category==='Ice Cream').forEach(base=>{
    const item=items.find(p=>p.category===base.category&&p.name.toLowerCase()===base.name.toLowerCase());
    if(item){item.prices=base.prices.slice();item.sizes=base.sizes.slice();item.pricePending=false;}
   });
   localStorage.setItem(this.key,JSON.stringify(items));
   localStorage.setItem(revision,'1');
  }
  const photoRevision='kbr_icecream_photos_20261005';
  if(!localStorage.getItem(photoRevision)){
   DEFAULT_PRODUCTS.filter(p=>p.category==='Ice Cream').forEach(base=>{
    const item=items.find(p=>p.category===base.category&&p.name.toLowerCase()===base.name.toLowerCase());
    if(item && !item.image)item.image=base.image;
   });
   localStorage.setItem(this.key,JSON.stringify(items));
   localStorage.setItem(photoRevision,'1');
  }
  const budgetRevision='kbr_budget_matcha_caramel_20261005';
  if(!localStorage.getItem(budgetRevision)){
   const updates={'Dirty Matcha':[69,79,99],'Caramel Latte':[59,69,89]};
   items.forEach(item=>{if(Object.hasOwn(updates,item.name))item.prices=updates[item.name].slice();});
   localStorage.setItem(this.key,JSON.stringify(items));
   localStorage.setItem(budgetRevision,'1');
  }
  return items;
 }catch(e){console.warn('Using original menu:',e);return structuredClone(DEFAULT_PRODUCTS);}},
 upgrade(items){
  items.forEach(p=>{if(p.category==='Soda'&&!p.name.endsWith(' Fruit Soda'))p.name+=' Fruit Soda';});
  DEFAULT_PRODUCTS.filter(p=>p.category==='Ice Cream'||(p.category==='Specials'&&['Nom Chompoo','Cha Yen'].includes(p.name))).forEach(p=>{if(!items.some(x=>x.category===p.category&&x.name.toLowerCase()===p.name.toLowerCase()))items.push(structuredClone(p));});
  return items;
 },
 save(items){const valid=this.validate(items);localStorage.setItem(this.key,JSON.stringify(valid));return valid;}
};
