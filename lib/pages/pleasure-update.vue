<template>
  <pleasure
    :entity="entity"
    :entry-id="entry"
    :value="value"
    method="update"
    :autoload="false"
    :key="id"
  ></pleasure>
</template>
<script>
  import pleasureClient from 'pleasure/dist/pleasure-client.js'

  export default {
    async asyncData ({ route: { params: { entity, entry } } }) {
      return {
        value: await pleasureClient.read(entity, entry),
        entity,
        entry
      }
    },
    computed: {
      id () {
        return `${ this.entity }-${ this.entry }`
      }
    }
  }
</script>
