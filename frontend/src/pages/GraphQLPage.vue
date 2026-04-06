<template>
  <iframe
    :src="graphqlUrl"
    style="width: 100%; height: calc(100vh - 64px); border: none; background: #121212;"
  ></iframe>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const graphqlUrl = computed(() => {
  const token = localStorage.getItem('token')
  return token
    ? `http://localhost:4000/graphql?token=${token}`
    : 'http://localhost:4000/graphql'
})
</script>
