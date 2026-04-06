<template>
  <div class="tag-manager">
    <div class="d-flex align-center mb-2">
      <div v-if="label" class="text-subtitle-2">{{ label }}</div>
      <v-btn icon="mdi-plus" variant="text" size="small" color="primary" class="ms-2" @click="addTag"></v-btn>
    </div>
    
    <div v-for="(tag, index) in modelValue" :key="index" class="mb-2">
      <TagInput
        v-model="modelValue[index]"
        :all-tags="allTags"
        removable
        @remove="removeTag(index)"
        @update:model-value="onUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TagInput from './TagInput.vue'

const props = defineProps<{
  modelValue: { name: string; value?: string | null }[]
  allTags: any[]
  label?: string
}>()

const emit = defineEmits(['update:modelValue'])

function addTag() {
  const newTags = [...props.modelValue, { name: '', value: '' }]
  emit('update:modelValue', newTags)
}

function removeTag(index: number) {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}

function onUpdate() {
  emit('update:modelValue', [...props.modelValue])
}
</script>
 Riverside:
