const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const {createServer,DB_FILE}=require('../demo-server-lib');

let server,base;
async function request(path,opts={}){const r=await fetch(base+path,opts);const d=await r.json();return {r,d};}
test.before(async()=>{if(fs.existsSync(DB_FILE))fs.unlinkSync(DB_FILE);server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(ok=>server.close(ok));});

test('salud del prototipo',async()=>{const {r,d}=await request('/api/health');assert.equal(r.status,200);assert.equal(d.ok,true);});
test('login ciudadano, creación y consulta de reporte',async()=>{let x=await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'yony@belloalerta.local',password:'Ciudadano123*'})});assert.equal(x.r.status,200);const token=x.d.token;const auth={'Content-Type':'application/json','Authorization':'Bearer '+token};x=await request('/api/reports',{method:'POST',headers:auth,body:JSON.stringify({category:'Grieta o fisura en terreno',description:'Prueba automática del prototipo funcional.',sector:'Prueba',perceivedLevel:'Medio',observedAt:'2026-11-11',lat:6.338,lng:-75.558})});assert.equal(x.r.status,201);const id=x.d.id;x=await request('/api/reports/'+id,{headers:auth});assert.equal(x.r.status,200);assert.equal(x.d.sector,'Prueba');assert.equal(x.d.status,'Registrado');});
test('administrador actualiza estado y queda trazabilidad',async()=>{let x=await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@belloalerta.local',password:'Admin123*'})});assert.equal(x.r.status,200);const auth={'Content-Type':'application/json','Authorization':'Bearer '+x.d.token};x=await request('/api/reports',{headers:auth});const target=x.d[0];x=await request('/api/reports/'+target.id,{method:'PATCH',headers:auth,body:JSON.stringify({status:'Atendido',note:'Prueba automática de cambio de estado.'})});assert.equal(x.r.status,200);x=await request('/api/reports/'+target.id,{headers:auth});assert.ok(x.d.history.some(h=>h.status==='Atendido'));});
