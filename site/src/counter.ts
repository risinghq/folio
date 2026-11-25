import "./site.css";

export default function Counter() {
  let count = 0;
  const root = document.createElement("div");
  root.className = "demo";
  const label = document.createElement("span");
  label.className = "label";
  const button = document.createElement("button");
  button.className = "btn btn-sm";
  button.type = "button";
  button.textContent = "Add one";
  const show = () => (label.textContent = `count: ${count}`);
  button.addEventListener("click", () => {
    count += 1;
    show();
  });
  show();
  root.append(button, label);
  return root;
}
