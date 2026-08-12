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

function storageKey(){ return `mi-seguimiento:${dateInput.value}`; }
function loadEntries(){ return JSON.parse(localStorage.getItem(storageKey()) || '[]'); }
function saveEntries(entries){ localStorage.setItem(storageKey(), JSON.stringify(entries)); }
function n(v){ return Math.round((Number(v)||0)*10)/10; }

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
  $('porcion-info').textContent = f ? `1 cantidad = ${f.porcion}. Valores por cantidad: ${f.kcal} kcal · ${f.proteina} g proteína.` : '';
}

function addEntry(){
  const f = selectedFood();
  const qty = Number(quantityInput.value);
  if(!f || !qty || qty<=0) return;
  const entries = loadEntries();
  entries.push({
    uid: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random()),
    foodId:f.id,nombre:f.nombre,porcion:f.porcion,momento:mealSelect.value,cantidad:qty,
    kcal:n(f.kcal*qty),proteina:n(f.proteina*qty),carbohidratos:n(f.carbohidratos*qty),grasas:n(f.grasas*qty)
  });
  saveEntries(entries); quantityInput.value=1; render();
}

function removeEntry(uid){
  saveEntries(loadEntries().filter(e=>e.uid!==uid)); render();
}

function clearDay(){
  if(loadEntries().length && confirm('¿Borrar todas las comidas de esta fecha?')){
    localStorage.removeItem(storageKey()); render();
  }
}

function render(){
  const entries = loadEntries();
  const totals = entries.reduce((a,e)=>({
    kcal:a.kcal+e.kcal,proteina:a.proteina+e.proteina,carbohidratos:a.carbohidratos+e.carbohidratos,grasas:a.grasas+e.grasas
  }),{kcal:0,proteina:0,carbohidratos:0,grasas:0});
  $('total-kcal').textContent=n(totals.kcal);
  $('total-prot').textContent=n(totals.proteina);
  $('total-carb').textContent=n(totals.carbohidratos);
  $('total-grasa').textContent=n(totals.grasas);
  $('vacio').hidden = entries.length>0;
  $('lista').innerHTML = entries.map(e=>`
    <div class="item">
      <div><strong>${e.nombre}</strong><small>${e.momento} · ${e.cantidad} × ${e.porcion} · P ${e.proteina} g · C ${e.carbohidratos} g · G ${e.grasas} g</small></div>
      <div class="kcal">${e.kcal} kcal</div>
      <button class="delete" data-uid="${e.uid}" aria-label="Eliminar">Eliminar</button>
    </div>`).join('');
  document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeEntry(b.dataset.uid));
}

dateInput.value = localISODate();
dateInput.addEventListener('change', render);
foodSelect.addEventListener('change', updatePortion);
$('agregar').addEventListener('click', addEntry);
$('borrar-dia').addEventListener('click', clearDay);
loadFoods().then(render);
