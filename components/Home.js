"use client";

import React from 'react';
import Link from 'next/link';
import { Calendar, MessageSquare, Clock, ArrowRight, User } from 'lucide-react';

const Home = () => {
  return (
    <div className="home-layout">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title" style={{ color: 'hsl(var(--primary))' }}>
            Connect Students with Faculty
          </h1>
          <p className="hero-subtitle">
            Streamline academic consultations with our simple booking platform. 
            Browse faculty, book appointments, and manage your academic meetings all in one place.
          </p>
        </div>
        <div className="hero-image-container">
          <img src="/hero-consultation.jpg" alt="Consultation" className="hero-image" />
          <div className="hero-overlay"></div>
        </div>
      </section>
      
      <div className="cta-section">
        <Link href="/login" className="btn btn-primary btn-lg">
          <User className="icon-left" />
          Proceed to Login
          <ArrowRight className="icon-right" />
        </Link>
      </div>

      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon">
            <Calendar className="icon" />
          </div>
          <h3 className="feature-title">Easy Scheduling</h3>
          <p className="feature-description">Book appointments with your preferred faculty members in just a few clicks.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <MessageSquare className="icon" />
          </div>
          <h3 className="feature-title">Real-time Communication</h3>
          <p className="feature-description">Stay connected with faculty through integrated messaging and notifications.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Clock className="icon" />
          </div>
          <h3 className="feature-title">Time Management</h3>
          <p className="feature-description">Efficiently manage your consultation schedule with automated reminders.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
