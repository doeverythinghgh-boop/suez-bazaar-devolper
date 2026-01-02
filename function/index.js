export default {
  fetch(request) {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Suze Bazaar Worker is running"
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
