"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Users, Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { LoginFormData } from '../types';

const Login: React.FC = () => {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        userType: 'student'
    });
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
    
    const { login, loading, currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser && !loading) {
            const role = currentUser.profile?.type;
            if (role === 'faculty') {
                router.replace('/faculty-dashboard');
            } else if (role === 'student') {
                router.replace('/student-dashboard');
            } else {
                router.replace('/');
            }
        }
    }, [currentUser, loading, router]);

    useEffect(() => {
        const message = searchParams?.get?.('message');
        if (message) {
            setSuccessMessage(message);
            const email = searchParams.get('email');
            if (email) setFormData(prev => ({ ...prev, email }));
            try { router.replace('/login'); } catch (e) { /* ignore */ }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoggingIn(true);

        const { email, password, userType } = formData;

        const result = await login(email, password, userType);

        if (result.success) {
            // Keep isLoggingIn true during navigation to prevent login page from showing
            const role = result.user?.profile?.type || userType;
            if (role === 'faculty') {
                router.replace('/faculty-dashboard');
            } else if (role === 'student') {
                router.replace('/student-dashboard');
            } else {
                router.replace('/');
            }
        } else {
            setIsLoggingIn(false);
            setError(result.error || 'Login failed');
        }
    };

    // Hide login page if user is logged in or currently logging in
    if (currentUser || isLoggingIn || loading) {
        return null;
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-branding">
                    <div className="login-brand-content">
                        <Image 
                            src="/AcadLinkLogo.png" 
                            alt="AcadLink" 
                            width={300} 
                            height={300} 
                            className="login-logo" 
                            priority
                        />
                        <p className="login-tagline">
                            Connect with professors and students. <br />
                            Manage your consultations seamlessly.
                        </p>
                    </div>
                </div>

                <div className="login-form-section">
                    <div className="login-form-container">
                        {successMessage && (
                            <div className="alert alert-success">
                                <div className="alert-content">
                                    <CheckCircle className="alert-icon alert-icon-success" />
                                    <div>
                                        <span className="alert-text alert-text-success">{successMessage}</span>
                                        {searchParams?.get('showEmailVerification') && (
                                            <div className="email-verification-notice">
                                                <div className="email-verification-content">
                                                    <Mail className="email-icon" />
                                                    <span className="email-text">
                                                        📧 Check your email for verification link
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error">
                                <div className="alert-content">
                                    <AlertCircle className="alert-icon alert-icon-error" />
                                    <span className="alert-text alert-text-error">{error}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="login-form">
                            <input
                                name="email"
                                type="email"
                                placeholder="Email address"
                                className="login-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            
                            <div className="password-field">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    className="login-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                                </button>
                            </div>

                            <div className="user-type-selection">
                                <label className={`user-type-option ${formData.userType === 'student' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="student"
                                        checked={formData.userType === 'student'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <User className="option-icon" />
                                    Student
                                </label>
                                <label className={`user-type-option ${formData.userType === 'faculty' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="faculty"
                                        checked={formData.userType === 'faculty'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <Users className="option-icon" />
                                    Faculty
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="login-submit-btn"
                            >
                                {isLoggingIn ? (
                                    <div className="loading-content">
                                        <div className="loading-spinner"></div>
                                        Logging in...
                                    </div>
                                ) : (
                                    'Log In'
                                )}
                            </button>

                            <Link href="/forgot-password" className="forgot-link">
                                Forgotten password?
                            </Link>
                        </form>

                        <div className="form-divider"></div>

                        <Link href="/register" className="create-account-btn">
                            Create New Account
                        </Link>
                    </div>

                    <div className="login-footer">
                        <p className="terms-text">
                            By logging in, you agree to our <strong>Terms & Conditions</strong> and <strong> Privacy Policy</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
