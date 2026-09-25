We have the Lemon Squeezy checkout link. Please proceed immediately with Task 2 Step B and finalizing the Docs pages using this URL:
https://getlocalnodeops.lemonsqueezy.com/checkout/buy/65274943-26ca-490f-9fab-e5ab0231d73b

Please execute the following:
1. Implement the Sticky CTA Bar: Build and integrate the sticky commercial CTA bar for the bottom of all blog and `/docs` pages. The primary action button must use the checkout link to purchase the Docker Stack.
2. Finalize the Docs Funnel: Build out the `/docs` page (e.g., `src/pages/docs.astro`) using the exact copy provided below so it serves as a clear deployment guide and conversion funnel. Make sure it is styled cleanly with Tailwind and looks professional.
3. Fix CSS Contrast: Fix the dark mode color contrast bug on `.article-action-btn` in `global.css` (ensuring a WCAG-compliant contrast ratio above 4.5:1).
4. Deploy: Stage all of these changes so we can push the Docs, the CTA bar, and the new CUDA OOM blog post live simultaneously.

***

EXACT COPY FOR THE /DOCS PAGE:

### Page Title: LocalNodeOps Pro Docker Stack
### Subtitle: The production-ready local LLM environment. Deploy inference, WebUI, and vector search in minutes, not days.

(Insert Primary CTA Button here: "Get the Docker Stack - $35" linking to https://getlocalnodeops.lemonsqueezy.com/checkout/buy/65274943-26ca-490f-9fab-e5ab0231d73b)

---

### Stop Fighting Your Environment
Setting up local Large Language Models shouldn't require a weekend of debugging CUDA drivers, fixing Python dependency conflicts, and manually routing ports. 

The **LocalNodeOps Pro Docker Stack** is our internal, production-hardened `docker-compose` environment. It gives you a fully containerized, zero-config local AI server that just works.

### What's Inside the Stack?
*   **Optimized Inference Engine:** Pre-configured for Ollama (or vLLM) with automatic GPU passthrough and CUDA toolkit integration.
*   **Open WebUI:** A ChatGPT-like interface ready out-of-the-box, connected directly to your local models.
*   **Vector Database (Qdrant):** Pre-networked for seamless RAG (Retrieval-Augmented Generation) document chatting.
*   **Real-Time VRAM Monitoring:** Custom Grafana dashboards and Prometheus hooks to watch your GPU memory usage and prevent OOM crashes.
*   **Automated Backups:** Pre-mapped persistent volume scripts so you never lose your chat history or custom system prompts.

---

### Deploy in 3 Steps

**1. Prerequisites**
Ensure you have Docker and the NVIDIA Container Toolkit installed on your host machine (Ubuntu/Debian recommended).

**2. Download & Configure**
Extract the Pro Stack `.zip` file. Copy the `.env.example` to `.env` and set your preferred passwords and API keys.

**3. Launch**
Run a single command to spin up the entire ecosystem:
`docker compose up -d`

*(Your WebUI will instantly be available at `localhost:3000`, and Grafana VRAM monitoring at `localhost:3001`)*

---

(Insert Secondary CTA Button here: "Purchase & Download the Stack" linking to https://getlocalnodeops.lemonsqueezy.com/checkout/buy/65274943-26ca-490f-9fab-e5ab0231d73b)

### Frequently Asked Questions

**Does this work on Windows?**
Yes, via WSL2 (Windows Subsystem for Linux) with Docker Desktop. However, we strongly recommend a native Linux environment (like Ubuntu) for maximum VRAM efficiency and zero overhead.

**Will this fix my CUDA OOM errors?**
While it cannot physically add VRAM to your GPU, our included Grafana dashboard allows you to monitor exactly what is eating your memory in real-time, making it incredibly easy to diagnose and prevent crashes. 

**Is this a one-time purchase?**
Yes. You pay $35 once, and you own the stack and all its configuration files forever.