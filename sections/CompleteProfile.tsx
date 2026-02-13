import React, { useState } from 'react';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { UploadPreview } from '../components/UploadPreview';
import { addToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

interface CompleteProfileProps {
    role: string | null;
    onComplete: () => void;
}

const getSteps = (role: string | null) => {
    const roleLower = role?.toLowerCase();

    // Admins only need to upload a profile picture
    if (roleLower === 'admin') {
        return [
            { id: 'profile-pic', title: 'Profile Picture', subtitle: 'Upload your profile photo.' }
        ];
    }

    const isFreelancer = roleLower === 'freelancer';
    const steps = [
        { id: 'profile-pic', title: 'Profile Picture', subtitle: 'Upload your profile photo.' },
        { id: 'phone', title: 'Phone Number', subtitle: 'Add your contact number.' },
        { id: 'bank', title: 'Bank Details', subtitle: 'For payouts and payments.' },
    ];

    if (isFreelancer) {
        steps.push(
            { id: 'payoneer', title: 'Payoneer Details', subtitle: 'Connect your Payoneer account.' },
            { id: 'cnic', title: 'Identity Verification', subtitle: 'Upload your CNIC.' }
        );
    }

    return steps;
};

const CompleteProfile: React.FC<CompleteProfileProps> = ({ role, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const { refreshProfile } = useUser();

    // Form Data State
    const [profilePic, setProfilePic] = useState<string | null>(localStorage.getItem('nova_draft_profilePic'));
    const [phone, setPhone] = useState(localStorage.getItem('nova_draft_phone') || '');
    const [bankName, setBankName] = useState(localStorage.getItem('nova_draft_bankName') || '');
    const [accountTitle, setAccountTitle] = useState(localStorage.getItem('nova_draft_accountTitle') || '');
    const [iban, setIban] = useState(localStorage.getItem('nova_draft_iban') || '');
    const [payoneerEmail, setPayoneerEmail] = useState(localStorage.getItem('nova_draft_payoneerEmail') || '');
    const [cnicFront, setCnicFront] = useState<string | null>(localStorage.getItem('nova_draft_cnicFront'));
    const [cnicBack, setCnicBack] = useState<string | null>(localStorage.getItem('nova_draft_cnicBack'));

    // Persist to localStorage
    React.useEffect(() => {
        if (profilePic) localStorage.setItem('nova_draft_profilePic', profilePic);
        localStorage.setItem('nova_draft_phone', phone);
        localStorage.setItem('nova_draft_bankName', bankName);
        localStorage.setItem('nova_draft_accountTitle', accountTitle);
        localStorage.setItem('nova_draft_iban', iban);
        localStorage.setItem('nova_draft_payoneerEmail', payoneerEmail);
        if (cnicFront) localStorage.setItem('nova_draft_cnicFront', cnicFront);
        if (cnicBack) localStorage.setItem('nova_draft_cnicBack', cnicBack);
    }, [profilePic, phone, bankName, accountTitle, iban, payoneerEmail, cnicFront, cnicBack]);

    // Clear draft on success
    const clearDraft = () => {
        const keys = [
            'nova_draft_profilePic', 'nova_draft_phone', 'nova_draft_bankName',
            'nova_draft_accountTitle', 'nova_draft_iban', 'nova_draft_payoneerEmail',
            'nova_draft_cnicFront', 'nova_draft_cnicBack'
        ];
        keys.forEach(k => localStorage.removeItem(k));
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeSetter, setActiveSetter] = useState<((val: string | null) => void) | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const steps = getSteps(role);
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    const handleUpload = (setter: (val: string | null) => void, fieldName: string) => {
        setActiveSetter(() => setter);
        setActiveField(fieldName);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && activeSetter && activeField) {
            setUploadingField(activeField);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user.id || 'anonymous';

                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}-${Math.random()}.${fileExt}`;

                // Use 'avatars' bucket for profile pic, 'documents' for others
                const bucket = activeField === 'profile-pic' ? 'avatars' : 'documents';
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);

                activeSetter(publicUrl);

                addToast({
                    type: 'success',
                    title: 'File Uploaded',
                    message: `${activeField.replace('-', ' ')} uploaded successfully.`
                });
            } catch (error: any) {
                console.error('Upload error:', error);
                addToast({
                    type: 'error',
                    title: 'Upload Failed',
                    message: error.message || 'Failed to upload file.'
                });
            } finally {
                setUploadingField(null);
            }
        }
        if (event.target) event.target.value = '';
    };

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLastStep) {
            setLoading(true);

            try {
                // Get current session
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    throw new Error('Your session has expired or you are not logged in. Please sign in again.');
                }

                // Extract name from email (before @)
                const name = user.email?.split('@')[0] || 'User';

                const isAppAdmin = role?.toLowerCase() === 'admin';

                // Upsert profile data to handle both new users and invited users (who already have a profile row)
                const { error } = await supabase
                    .from('profiles')
                    .upsert([
                        {
                            id: user.id,
                            email: user.email,
                            name: name,
                            role: role,
                            status: isAppAdmin ? 'Active' : 'Pending', // Admins are active immediately
                            phone: isAppAdmin ? '' : phone,
                            payment_email: isAppAdmin ? user.email : (payoneerEmail || user.email),
                            avatar_url: profilePic,
                            bank_name: bankName,
                            account_title: accountTitle,
                            iban: iban,
                            // In a real app, these would be URLs from Supabase Storage
                            cnic_front_url: isAppAdmin ? null : cnicFront,
                            cnic_back_url: isAppAdmin ? null : cnicBack,
                            created_at: new Date().toISOString()
                        }
                    ], { onConflict: 'id' });

                if (error) throw error;

                clearDraft();
                await refreshProfile();

                addToast({
                    type: 'success',
                    title: 'Profile Submitted',
                    message: 'Your profile has been submitted for admin review.',
                });

                onComplete();
            } catch (error: any) {
                console.error('Error saving profile:', error);
                addToast({
                    type: 'error',
                    title: 'Submission Failed',
                    message: error.message || 'Failed to save profile. Please try again.',
                });
            } finally {
                setLoading(false);
            }
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
    };

    const renderStepContent = () => {
        const stepId = steps[currentStep].id;

        switch (stepId) {
            case 'profile-pic':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="flex flex-col gap-4 items-center justify-center py-8 order-2 md:order-1">
                            <UploadPreview
                                variant="circular"
                                status={uploadingField === 'profile-pic' ? 'uploading' : profilePic ? 'success' : 'idle'}
                                imageSrc={profilePic || undefined}
                                onUpload={() => handleUpload(setProfilePic, 'profile-pic')}
                                onRemove={() => setProfilePic(null)}
                                onReplace={() => handleUpload(setProfilePic, 'profile-pic')}
                            />
                            <p className="text-sm font-medium text-gray-400">Click to upload your photo</p>
                        </div>

                        <div className="bg-surface-bg/50 p-6 rounded-2xl border border-surface-border order-1 md:order-2">
                            <h4 className="text-sm font-bold text-white mb-4">Good Profile Picture Example</h4>
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src="/example-profile.jpg"
                                    alt="Ideal Profile Example"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-brand-success/50"
                                />
                                <div className="space-y-1">
                                    <p className="text-xs text-brand-success font-medium">✓ Ideal Example</p>
                                    <p className="text-xs text-gray-500">Professional & Clear</p>
                                </div>
                            </div>
                            <ul className="space-y-2 text-xs text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-primary mt-0.5">•</span>
                                    <span>Use a clear, high-resolution headshot.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-primary mt-0.5">•</span>
                                    <span>Ensure your face is clearly visible.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-primary mt-0.5">•</span>
                                    <span>Use a neutral or professional background.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-primary mt-0.5">•</span>
                                    <span>Good lighting makes a big difference.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                );
            case 'phone':
                return (
                    <div className="w-full">
                        <Input
                            label="Phone Number"
                            placeholder="9234198331534"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                );
            case 'bank':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Bank Name"
                            placeholder="e.g. Chase Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            required
                        />
                        <Input
                            label="Account Title"
                            placeholder="Full Name on Account"
                            value={accountTitle}
                            onChange={(e) => setAccountTitle(e.target.value)}
                            required
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="IBAN / Account Number"
                                placeholder="International Bank Account Number"
                                value={iban}
                                onChange={(e) => setIban(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                );
            case 'payoneer':
                return (
                    <Input
                        label="Payoneer Email"
                        type="email"
                        placeholder="email@example.com"
                        value={payoneerEmail}
                        onChange={(e) => setPayoneerEmail(e.target.value)}
                        required
                    />
                );
            case 'cnic':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-400 mb-2">CNIC Front</p>
                            <UploadPreview
                                variant="rectangular"
                                status={uploadingField === 'cnic-front' ? 'uploading' : cnicFront ? 'success' : 'idle'}
                                imageSrc={cnicFront || undefined}
                                onUpload={() => handleUpload(setCnicFront, 'cnic-front')}
                                onRemove={() => setCnicFront(null)}
                                onReplace={() => handleUpload(setCnicFront, 'cnic-front')}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-400 mb-2">CNIC Back</p>
                            <UploadPreview
                                variant="rectangular"
                                status={uploadingField === 'cnic-back' ? 'uploading' : cnicBack ? 'success' : 'idle'}
                                imageSrc={cnicBack || undefined}
                                onUpload={() => handleUpload(setCnicBack, 'cnic-back')}
                                onRemove={() => setCnicBack(null)}
                                onReplace={() => handleUpload(setCnicBack, 'cnic-back')}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const progressPercentage = ((currentStep + 1) / steps.length) * 100;

    return (
        <div className="w-full max-w-4xl bg-surface-card border border-surface-border p-10 rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 my-10">
            {/* Header with Progress Bar */}
            <div className="mb-10">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
                    <p className="text-gray-400">{steps[currentStep].subtitle}</p>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
                    <div
                        className="bg-brand-primary h-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            <form className="space-y-10" onSubmit={handleNext}>

                <div className="min-h-[300px] flex flex-col justify-center">
                    {renderStepContent()}
                </div>

                <div className="pt-6 border-t border-surface-border flex justify-between items-center gap-4">
                    <div className="flex gap-4 items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleBack}
                            disabled={isFirstStep}
                            className={isFirstStep ? 'opacity-0 pointer-events-none' : ''}
                        >
                            Back
                        </Button>
                        {isFirstStep && (
                            <button
                                type="button"
                                onClick={async () => {
                                    localStorage.removeItem('nova_onboarding_step');
                                    localStorage.removeItem('nova_selected_role');
                                    await supabase.auth.signOut();
                                    window.location.reload();
                                }}
                                className="text-xs font-medium text-gray-500 hover:text-brand-error transition-colors"
                            >
                                Sign Out
                            </button>
                        )}
                    </div>

                    <Button
                        variant="primary"
                        className="px-12 py-3"
                        type="submit"
                        loading={loading}
                    >
                        {isLastStep ? 'Complete Setup' : 'Next Step'}
                    </Button>
                </div>

            </form>
        </div>
    );
};

export default CompleteProfile;
