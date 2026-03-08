import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '@/components/SearchView.vue'
import CollectionView from '@/components/CollectionView.vue'
import ExerciseView from '@/components/ExerciseView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/search'
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView,
      meta: { title: '汉字检索' }
    },
    {
      path: '/collection',
      name: 'collection',
      component: CollectionView,
      meta: { title: '我的收藏' }
    },
    {
      path: '/exercise',
      name: 'exercise',
      component: ExerciseView,
      meta: { title: '自主练习' }
    }
  ],
})

router.afterEach((to) => {
  document.title = `${to.meta.title} - 中日字鉴` || '中日字鉴'
})

export default router
