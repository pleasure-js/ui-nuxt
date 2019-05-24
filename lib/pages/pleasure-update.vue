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
  import { PleasureApiClient } from 'pleasure-api-client'
  const pleasureApiClient = PleasureApiClient.instance()

  export default {
    async asyncData ({ route: { params: { entity, entry } } }) {
      return {
        value: await pleasureApiClient.read(entity, entry),
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
