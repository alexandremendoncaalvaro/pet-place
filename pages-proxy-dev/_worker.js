export default {
  async fetch(request, env) {
    return env.PET_PLACE.fetch(request);
  },
};
