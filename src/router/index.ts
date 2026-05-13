import Dashboard from "@/views/Dashboard.vue";
import Home from "@/views/Home.vue";
import HomeView from "@/views/HomeView.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: HomeView },
    { path: "/dashboard", component: HomeView },
    { path: "/:pathMatch(.*)*", component: () => import("@/views/NotFound.vue") },
  ],
});

export default router;
