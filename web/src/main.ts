import "virtual:uno.css";
// @ts-ignore
import "lew-ui/style";
import "./styles/index.css";

import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import permission from "./directives/permission";
import router from "./router";
import { useUserStore } from "./store/user";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.directive("permission", permission);

// 401 刷新失败 → 全局登出跳转
window.addEventListener("auth:logout", () => {
  const userStore = useUserStore();
  userStore.reset();
  window.location.href = "/login";
});

app.mount("#app");
