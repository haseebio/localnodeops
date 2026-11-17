// Shared by the home page and /hardware so both show identical answers.
// The answers match the calculator footnote and /methodology; no claim here is
// made only on one page.
export const calculatorFaq = [
  {
    question: 'How accurate is the VRAM calculator?',
    answer:
      'It depends on the mode. In "Generic estimate" mode, both the model weight size and the KV cache figure are estimates based on a reference architecture for the selected size bucket. In "model-specific" mode, the weight size is exact (the real .gguf file size synced from Hugging Face). The KV cache is computed from the model\u2019s published attention settings when LocalNodeOps has them on record, and otherwise estimated from the nearest reference architecture. Either way the total assumes an fp16 cache, a batch size of 1 and a 10% runtime overhead, so treat it as an estimate.',
  },
  {
    question: 'Where does the KV cache figure come from for synced models?',
    answer:
      'KV cache size depends on a model\u2019s layer count, KV head count, and head dimension. The Hugging Face data this calculator syncs gives exact .gguf file sizes but no architecture details. For some models LocalNodeOps records the published attention settings and computes the KV cache from them. For the others, the calculator matches the nearest reference architecture (7B, 13B, 32B, 70B or 120B) by parsing an approximate parameter count from the model name, only when the match is within 5B and the model is not a mixture-of-experts. Otherwise no total is shown. See /methodology for the exact formula and its limitations.',
  },
  {
    question: 'Does more VRAM always mean I can run a bigger model?',
    answer:
      'No. VRAM is consumed by three separate things: model weights, KV cache, and runtime overhead. A long context window can consume more VRAM than the model weights themselves, especially on older MHA-style architectures. Sizing for weights alone is the most common mistake people make.',
  },
  {
    question: 'What does "Fits on" actually check?',
    answer:
      'It compares the estimated total VRAM (for vLLM, the total divided by 0.90) against the VRAM of the cards in the list, multiplied by the number of GPUs you choose. The list covers common consumer cards plus two workstation and datacenter cards (RTX 6000 Ada and A100) that are shown for reference only. It does not account for VRAM already in use by your OS, other applications, or a second model already loaded.',
  },
];
