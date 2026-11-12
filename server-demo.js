const {createServer}=require('./demo-server-lib');
const port=Number(process.env.PORT||3000);
createServer().listen(port,()=>console.log(`Bello Alerta demo: http://localhost:${port}`));
