async function run() {
  const content = `1 ALT_COREKS_B_OR_01_C
3 ALT_ALIZE_B_MU_31_R2
2 ALT_ALIZE_B_OR_42_R1
2 ALT_ALIZE_B_OR_44_C
2 ALT_BISE_B_OR_49_C
3 ALT_BISE_B_OR_54_C
3 ALT_BISE_B_OR_59_C
2 ALT_CORE_B_LY_15_R2
2 ALT_CORE_B_OR_08_C
2 ALT_CORE_B_OR_09_C
1 ALT_CORE_B_OR_20_U_7022
2 ALT_CORE_B_OR_30_C
2 ALT_CORE_B_YZ_20_R2
1 ALT_COREKS_B_BR_09_U_4235
3 ALT_COREKS_B_OR_05_R1
2 ALT_COREKS_B_OR_14_C
3 ALT_COREKS_B_OR_16_R1
1 ALT_COREKS_B_OR_18_U_1071
3 ALT_COREKS_B_OR_24_C`;

  await fetch("http://localhost:3000/api/project/save-decklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  const res = await fetch("http://localhost:3000/api/run-command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: "plugins/altered/fetch.py",
      args: ["game/decklist/current.txt", "ajordat"]
    })
  });
  console.log(await res.json());
}
run();
