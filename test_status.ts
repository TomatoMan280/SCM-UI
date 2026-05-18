async function test() {
  const r = await fetch('http://localhost:3000/api/status');
  console.log(await r.json());
}
test();
