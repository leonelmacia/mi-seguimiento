const fallbackFoods = [
  {id:'pao_frances',nombre:'Pão francês',porcion:'1 unidad (50 g)',kcal:135,proteina:4.5,carbohidratos:28,grasas:1.5},
  {id:'huevo_hervido',nombre:'Huevo hervido',porcion:'1 unidad',kcal:78,proteina:6.3,carbohidratos:0.6,grasas:5.3},
  {id:'huevo_frito_manteca',nombre:'Huevo frito con manteca',porcion:'1 unidad',kcal:110,proteina:6.3,carbohidratos:0.5,grasas:9},
  {id:'amstel_350',nombre:'Cerveza Amstel',porcion:'1 lata (350 ml)',kcal:140,proteina:1,carbohidratos:11,grasas:0},
  {id:'mamao',nombre:'Mamão',porcion:'100 g',kcal:43,proteina:0.5,carbohidratos:11,grasas:0.3},
  {id:'soja_granulada_cocida',nombre:'Soja granulada cocida',porcion:'100 g',kcal:115,proteina:16,carbohidratos:10,grasas:1},
  {id:'pescado_cocido',nombre:'Pescado cocido',porcion:'100 g',kcal:130,proteina:24,carbohidratos:0,grasas:4},
  {id:'papa_hervida',nombre:'Papa hervida',porcion:'100 g',kcal:87,proteina:1.9,carbohidratos:20,grasas:0.1},
  {id:'cafe_leche_azucar',nombre:'Café con leche en polvo y azúcar',porcion:'1 taza',kcal:80,proteina:1.5,carbohidratos:16,grasas:1.2}
];

let foods = [];
const $ = id => document.getElementById(id);
const dateInput = $('fecha');
const foodSelect = $('alimento');
const quantityInput = $('cantidad');
const mealSelect = $('momento');

function localISODate(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
function storageKey(date=dateInput.value){ return `mi-seguimiento:${date}`; }
function loadEntries(date=dateInput.value){ return JSON.parse(localStorage.getItem(storageKey(date)) || '[]'); }
function saveEntries(entries,date=dateInput.value){ localStorage.setItem(storageKey(date), JSON.stringify(entries)); }
function n(v){ return Math.round((Number(v)||0)*10)/10; }
function totals(entries){
  return entries.reduce((a,e)=>({
    kcal:a.kcal+(Number(e.kcal)||0),proteina:a.proteina+(Number(e.proteina)||0),
    carbohidratos:a.carbohidratos+(Number(e.carbohidratos)||0),grasas:a.grasas+(Number(e.grasas)||0)
  }),{kcal:0,proteina:0,carbohidratos:0,grasas:0});
}
function allDays(){
  return Object.keys(localStorage)
    .filter(k=>k.startsWith('mi-seguimiento:'))
    .map(k=>k.replace('mi-seguimiento:',''))
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && loadEntries(d).length)
    .sort().reverse();
}
function niceDate(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date(y,m-1,d));
}

async function loadFoods(){
  try{
    const r = await fetch('data/alimentos.json');
    if(!r.ok) throw new Error('No se pudo cargar alimentos');
    foods = await r.json();
  }catch(e){ foods = fallbackFoods; }
  foodSelect.innerHTML = foods.map(f=>`<option value="${f.id}">${f.nombre}</option>`).join('');
  updatePortion();
}
function selectedFood(){ return foods.find(f=>f.id===foodSelect.value); }
function updatePortion(){
  const f = selectedFood();
  $('porcion-info').textContent = f ? `1 cantidad = ${f.porcion}. ${f.kcal} kcal · ${f.proteina} g proteína.` : '';
}
function addEntry(){
  const f = selectedFood(); const qty = Number(quantityInput.value);
  if(!f || !qty || qty<=0) return;
  const entries = loadEntries();
  entries.push({uid:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),foodId:f.id,nombre:f.nombre,porcion:f.porcion,momento:mealSelect.value,cantidad:qty,kcal:n(f.kcal*qty),proteina:n(f.proteina*qty),carbohidratos:n(f.carbohidratos*qty),grasas:n(f.grasas*qty)});
  saveEntries(entries); quantityInput.value=1; renderAll();
}
function removeEntry(uid){ saveEntries(loadEntries().filter(e=>e.uid!==uid)); renderAll(); }
function clearDay(){
  if(loadEntries().length && confirm('¿Borrar todas las comidas de esta fecha?')){
    localStorage.removeItem(storageKey()); renderAll();
  }
}
function renderDay(){
  const entries = loadEntries(); const t = totals(entries);
  $('total-kcal').textContent=n(t.kcal); $('total-prot').textContent=n(t.proteina); $('total-carb').textContent=n(t.carbohidratos); $('total-grasa').textContent=n(t.grasas);
  $('vacio').hidden = entries.length>0;
  $('lista').innerHTML = entries.map(e=>`<div class="item"><div><strong>${e.nombre}</strong><small>${e.momento} · ${e.cantidad} × ${e.porcion} · P ${e.proteina} g · C ${e.carbohidratos} g · G ${e.grasas} g</small></div><div class="kcal">${e.kcal} kcal</div><button class="delete" data-uid="${e.uid}">Eliminar</button></div>`).join('');
  document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeEntry(b.dataset.uid));
}
function renderHistory(){
  const days=allDays(); $('dias-cargados').textContent=`${days.length} ${days.length===1?'día':'días'}`; $('historial-vacio').hidden=days.length>0;
  $('historial-lista').innerHTML=days.map(d=>{const t=totals(loadEntries(d));return `<button class="history-day" data-date="${d}"><div><strong>${niceDate(d)}</strong><small>${loadEntries(d).length} registros</small></div><div class="history-macros"><span>${n(t.kcal)} kcal</span><span>${n(t.proteina)} g proteína</span></div></button>`}).join('');
  document.querySelectorAll('.history-day').forEach(b=>b.onclick=()=>{dateInput.value=b.dataset.date;showView('hoy');renderAll();});
}
function renderAccumulated(){
  const from=$('desde').value, to=$('hasta').value;
  const days=allDays().filter(d=>(!from||d>=from)&&(!to||d<=to));
  let sum={kcal:0,proteina:0,carbohidratos:0,grasas:0}; let registros=0;
  days.forEach(d=>{const e=loadEntries(d),t=totals(e); registros+=e.length; sum.kcal+=t.kcal;sum.proteina+=t.proteina;sum.carbohidratos+=t.carbohidratos;sum.grasas+=t.grasas;});
  const count=days.length||1;
  $('acc-kcal').textContent=n(sum.kcal); $('acc-prot').textContent=n(sum.proteina); $('avg-kcal').textContent=days.length?n(sum.kcal/count):0; $('avg-prot').textContent=days.length?n(sum.proteina/count):0;
  $('rango-texto').textContent=from||to?`${from||'inicio'} → ${to||'hoy'}`:'Todos los días';
  $('acumulado-resumen').innerHTML=`<div><strong>${days.length}</strong><span>Días registrados</span></div><div><strong>${registros}</strong><span>Comidas/registros</span></div><div><strong>${n(sum.carbohidratos)}</strong><span>g carbohidratos</span></div><div><strong>${n(sum.grasas)}</strong><span>g grasas</span></div>`;
}
function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
  if(view==='historial') renderHistory(); if(view==='acumulado') renderAccumulated();
}
function renderAll(){ renderDay(); renderHistory(); renderAccumulated(); }

dateInput.value=localISODate();
dateInput.addEventListener('change',()=>{renderDay();showView('hoy');});
foodSelect.addEventListener('change',updatePortion);
$('agregar').addEventListener('click',addEntry);
$('borrar-dia').addEventListener('click',clearDay);
$('aplicar-rango').addEventListener('click',renderAccumulated);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>showView(t.dataset.view)));
loadFoods().then(renderAll);
