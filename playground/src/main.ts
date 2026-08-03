import { createApp } from "vue";
import { plugin } from "@formkit/vue";
import { formkitConfig } from "@zeng-alt/formkit-form-builder";
import App from "./App.vue";
import "uno.css";
import "./style.css";

createApp(App).use(plugin, formkitConfig()).mount("#app");
