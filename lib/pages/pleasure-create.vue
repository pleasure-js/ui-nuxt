<template>
  <pleasure
    :entity="entity"
    method="create"
    :key="id"
  ></pleasure>
</template>
<script>
  export default {
    data () {
      const { entity } = this.$route.params

      return {
        entity,
      }
    },
    computed: {
      id () {
        return `${ this.entity }-${ this.entry }`
      }
    }
  }
</script>
