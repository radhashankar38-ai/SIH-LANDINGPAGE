# NER-LIS — Geotechnical Landslide Intelligence System

> **North-Eastern Region Multi-Hazard Risk Monitoring & Autonomous Early Warning System**  
> Built for the Smart India Hackathon (SIH) — High-Altitude InSAR, Borehole Telemetry, and Physics-Informed Kinematics.

---

## 🌟 Overview

**NER-LIS** is a modern, high-performance web experience for real-time geotechnical slope failure monitoring across the Eastern Himalayas. It features an interactive, scroll-driven timeline scrubber paired with physics-informed simulation models and live telemetry visualizations.

- **Interactive Mountain Timeline**: 75-frame photorealistic canvas scrubber tracking slope failure from stable baseline to catastrophic rockfall and post-failure equilibrium.
- **Modern Floating Pill Header**: Glassmorphic floating island navigation with audio controls and emergency simulation overrides.
- **8-State Geotechnical Matrix**: Live surveillance grid covering Sikkim, Arunachal Pradesh, Meghalaya, Assam, Mizoram, Manipur, Nagaland, and Tripura.
- **Slope Failure Simulator**: Real-time Factor of Safety (FoS) computation utilizing the Mohr-Coulomb failure criterion with rainfall infiltration and seismic peak ground acceleration (PGA) sliders.
- **Sensor Telemetry Grid**: Real-time canvas waveforms for High-Altitude Weather Radars, Soil Moisture Time-Domain Reflectometry, and InSAR Orbiters.
- **Procedural Acoustic Engine**: Multi-layer procedural Web Audio acoustic synthesizer simulating infrasonic tectonic rumbles, scree avalanches, and canyon spatial reverberations.
- **Official Government Portals**: Integrated links to [NER-DRR](https://www.nerdrr.gov.in/), [NDMA India](https://ndma.gov.in/), and the [Geological Survey of India](https://gsi.gov.in/).

---

## 🚀 Quick Start

To run the landing page locally:

```bash
# Clone the repository
git clone https://github.com/radhashankar38-ai/SIH-LANDINGPAGE.git
cd SIH-LANDINGPAGE

# Start local server (Python 3)
python -m http.server 8000
```

Open [http://localhost:8000/](http://localhost:8000/) in your web browser.

---

## 📁 Repository Structure

```
├── index.html          # Semantic HTML structure & accessible UI
├── style.css           # Vanilla CSS design system, glassmorphism & responsive layout
├── script.js           # Scroll background engine, physics simulation & audio synthesis
├── frames_jpg/         # Optimized 75-frame Himalayan timeline sequence
├── api/                # Simulated edge health & telemetry endpoints
├── .gitignore          # Repository ignore rules
└── README.md           # Project documentation
```

---

## 🌐 Official Portals & References

- **NER-DRR (North Eastern Regional Disaster Risk Reduction)**: [https://www.nerdrr.gov.in/](https://www.nerdrr.gov.in/)
- **National Disaster Management Authority (NDMA)**: [https://ndma.gov.in/](https://ndma.gov.in/)
- **Geological Survey of India (GSI)**: [https://gsi.gov.in/](https://gsi.gov.in/)
- **Operational Command Center Portal**: [https://sihapplication-neon.vercel.app/](https://sihapplication-neon.vercel.app/)

---

© 2026 NER-LIS // National Disaster Management Authority & North Eastern Council.
