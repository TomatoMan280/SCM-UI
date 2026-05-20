async function run() {
  const res = await fetch("https://api.altered.gg/cards/ALT_COREKS_B_OR_01_C");
  console.log("Status:", res.status);
  if (res.ok) {
    const text = await res.text();
    console.log(text.substring(0, 500));
  } else {
    console.log(await res.text());
  }
}
run();
