/*
  Secure ImgBB proxy for Cloudflare Workers.
  Required secret: IMGBB_API_KEY
  The key is NEVER exposed to GitHub Pages.
*/
export default {
  async fetch(request, env) {
    try {
      if (request.method === "POST") {
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await request.json();
          if (body.action !== "delete" || !body.deleteUrl) return Response.json({error:"invalid-delete"},{status:400});
          const r = await fetch(String(body.deleteUrl), {method:"GET"});
          return new Response(await r.text(), {status:r.status, headers:{"content-type":"application/json"}});
        }
        const form = await request.formData();
        const image = form.get("image");
        const title = String(form.get("title") || "platform-image");
        if (!(image instanceof File)) return Response.json({error:"image-required"},{status:400});
        if (image.size > 5*1024*1024 || !["image/jpeg","image/png","image/webp","image/gif"].includes(image.type)) return Response.json({error:"invalid-image"},{status:400});
        if (!env.IMGBB_API_KEY) return Response.json({error:"proxy-not-configured"},{status:500});
        const upload = new FormData(); upload.append("image",image); upload.append("name",title);
        const r = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`,{method:"POST",body:upload});
        return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
      }
      return new Response("Method Not Allowed",{status:405});
    } catch (error) { return Response.json({error:"proxy-error"},{status:500}); }
  }
};
