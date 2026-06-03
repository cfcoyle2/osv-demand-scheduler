const demoButton = document.getElementById("demoButton");
const demoMessage = document.getElementById("demoMessage");

if (demoButton && demoMessage) {
  demoButton.addEventListener("click", () => {
    demoMessage.textContent = "Your template is working. Replace this behavior with project logic.";
  });
}