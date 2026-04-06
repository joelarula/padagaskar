import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import TextsPage from '../pages/TextsPage.vue'
import TopicsPage from '../pages/TopicsPage.vue'
import TextFeaturesPage from '../pages/TextFeaturesPage.vue'
import GraphQLPage from '../pages/GraphQLPage.vue'

const routes = [
  { path: '/', name: 'dashboard', component: DashboardPage },
  { path: '/texts', name: 'texts', component: TextsPage },
  { path: '/topics', name: 'topics', component: TopicsPage },
  { path: '/text-features', name: 'text-features', component: TextFeaturesPage },
  { path: '/graphql', name: 'graphql', component: GraphQLPage },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
