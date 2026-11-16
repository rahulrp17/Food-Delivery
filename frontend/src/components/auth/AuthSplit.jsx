import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import heroImage from '../../assets/auth-hero.webp';
import saladImage from '../../assets/auth-slide-1.webp';
import pastaImage from '../../assets/auth-slide-2.webp';
import rollsImage from '../../assets/auth-slide-3.webp';
import vegImage from '../../assets/auth-slide-4.webp';
import Icon from '../ui/Icon';
import Logo from '../layout/Logo';
import './AuthSplit.css';

const slides = [
  { src: heroImage, alt: 'Grilled salmon with roasted vegetables' },
  { src: saladImage, alt: 'Grilled chicken salad with fresh greens' },
  { src: pastaImage, alt: 'Creamy chicken pasta with spinach' },
  { src: rollsImage, alt: 'Freshly baked savoury rolls' },
  { src: vegImage, alt: 'Roasted cauliflower with pomegranate' },
];

export default function AuthSplit({ heading, lead, children, footer, error }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <aside className="auth-visual" aria-hidden="true">
          <div className="visual-slider">
            <motion.div
              className="visual-track"
              initial={false}
              animate={{ x: `-${activeSlide * 100}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              {slides.map((slide, index) => (
                <div
                  className="visual-slide"
                  key={slide.src}
                  aria-hidden={index !== activeSlide}
                >
                  <img src={slide.src} className='' alt={slide.alt} loading="eager" />
                </div>
              ))}
            </motion.div>

            <div className="visual-dots">
              {slides.map((slide, index) => (
                <span
                  key={slide.src}
                  className={`dot${index === activeSlide ? ' active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="visual-content">
            <span className="visual-eyebrow">Freshly cooked &middot; Delivered fast</span>
            <h2>Good food, right to your door.</h2>
            <p>
              Seasonal ingredients, honest cooking and a menu built for everyday
              cravings.
            </p>
          </div>
        </aside>

        <section className="auth-form-side ">
          <div className="auth-form-shell">
            <div className="auth-topbar">
              <Link to="/" className="auth-back">
                <span className="auth-back-icon">
                  <Icon name="arrow-left" size={15} strokeWidth={2} />
                </span>
                <span>Back to home</span>
              </Link>

              <span className="auth-secure">
                <Icon name="shield-check" size={14} strokeWidth={1.8} />
                Secure access
              </span>
            </div>

            <motion.div
              className="auth-card"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="auth-brand">
                <Logo />
              </div>

              <header className="auth-header">
                <h1>{heading}</h1>
                <p>{lead}</p>
              </header>

              {error ? (
                <div className="auth-error" role="alert">
                  <Icon name="alert-circle" size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              {children}

              {footer}
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
