---
target: VacayOut /chat page and answer components
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/mnt/user-data/uploads/vacayout-india/src/components/chat/chat-view.tsx"
target_fingerprint: "sha256:557f71731ede658c2f42f5b4441d8ec44098b33f6ad35ba695982322c631bfc8"
target_path: /mnt/user-data/uploads/vacayout-india/src/components/chat/chat-view.tsx
timestamp: 2026-11-19T12-25-23Z
slug: src-components-chat-chat-view-tsx
---
# Critique: VacayOut /chat (chat-view + answer blocks), 2026-11-19
Method: dual-agent (A: design review · B: detector)
Score 22/40 (Acceptable). H1 2, H2 3, H3 2, H4 2, H5 2, H6 3, H7 2, H8 2, H9 2, H10 2.
Specificity: partly; generic AI-chat template in VacayOut colours; breaks Serif-for-Places, One Voice (coral everywhere), coral-text contrast.
Detector: 40 advisory (37 design-system-font-size: chat's own 0.75/0.8125/0.875rem scale; 2 design-system-color: #8fa8ff in .cx-box real, #000 mask false positive; 1 bounce-easing: animate-bounce dots ignore reduced motion). Overlay skipped (localhost unreachable).
Priority issues:
1. [P1] Waiting/streaming state noisy, uninformative, not ready for streaming (aria-live on whole message, forced auto-scroll). harden → animate
2. [P1] Coral and motion budget breaks calm-tool and DESIGN.md; #999/#888 grey and coral small text fail contrast. quieter → colorize
3. [P1] Comparisons don't lead with the decision; picks repeat compared places; chip re-asks. clarify → distill
4. [P2] Itinerary/info cards not ready for base/travel/cost/M-A-E; day number x3; mobile indent. layout → adapt
5. [P2] Free limit is a surprise; end of answer crowded; chips live after last question. onboard → clarify
Personas: Sam (screen reader) live-region chatter, #999 text; Casey (mobile) 20px targets, 430px reading area; Jordan (first-timer) three names for waiting, fake #tags.
