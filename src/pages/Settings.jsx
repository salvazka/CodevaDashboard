import { useState, useEffect } from 'react';
import { Bell, Lock, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ fullName: '', avatarFile: null, avatarPreview: null });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/login');
                return;
            }

            setUser(user);

            let { data, error, status } = await supabase
                .from('profiles')
                .select(`full_name, avatar_url, role`)
                .eq('id', user.id)
                .single();

            if (error && status !== 406) {
                console.error("Error loading profile:", error);
            }

            if (data) {
                setProfile(data);
                setFormData(prev => ({ ...prev, fullName: data.full_name || '', avatarPreview: data.avatar_url }));
            } else {
                // Handle case where profile doesn't exist yet
                setFormData(prev => ({ ...prev, fullName: user.user_metadata?.full_name || '' }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFormData({
                ...formData,
                avatarFile: file,
                avatarPreview: URL.createObjectURL(file)
            });
        }
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();

            let avatarUrl = profile?.avatar_url;

            if (formData.avatarFile) {
                const file = formData.avatarFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                let { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                avatarUrl = publicUrl;
            }

            const updates = {
                id: user.id,
                full_name: formData.fullName,
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            let { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;

            setProfile({ ...profile, ...updates });
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings & Profile</h1>
                </div>
                <button className="relative p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                </button>
            </header>

            <main className="p-5 space-y-6 flex-1 overflow-y-auto">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                    {loading ? (
                        <div className="w-24 h-24 rounded-full bg-slate-100 animate-pulse mb-4"></div>
                    ) : (
                        <div className="relative">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 dark:border-slate-800 shadow-sm"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold border-4 border-slate-50 dark:border-slate-800">
                                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 bg-success w-6 h-6 rounded-full border-4 border-white dark:border-slate-900"></div>
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-4">
                        {loading ? 'Loading...' : (profile?.full_name || user?.email)}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mt-2">
                        {profile?.role || 'Admin'}
                    </p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-4 text-primary text-sm font-medium hover:underline"
                    >
                        Edit Profile
                    </button>
                </div>

                {/* Account Security */}
                <section>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 pl-1">Account Security</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Change Password</p>
                                    <p className="text-xs text-slate-500">Update your access key</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-400" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group text-left"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                                    <LogOut size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-red-600 dark:text-red-400">Log Out</p>
                                    <p className="text-xs text-red-400/70">Sign out of this device</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

                <div className="text-center pt-4 pb-8">
                    <p className="text-xs text-slate-400 dark:text-slate-600">CodevaTech Admin App</p>
                    <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Version 2.4.1 (Build 20231024)</p>
                </div>
            </main>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Profile</h2>
                        <form onSubmit={updateProfile} className="space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative w-24 h-24 mb-2 group cursor-pointer">
                                    {formData.avatarPreview ? (
                                        <img
                                            src={formData.avatarPreview}
                                            alt="Preview"
                                            className="w-full h-full rounded-full object-cover border-4 border-slate-100 dark:border-slate-800"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border-4 border-slate-50 dark:border-slate-700">
                                            <span className="text-2xl font-bold">{formData.fullName?.charAt(0) || '?'}</span>
                                        </div>
                                    )}
                                    <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="text-white text-xs font-medium">Change</span>
                                    </label>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Click to upload new picture</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                    placeholder="Your Name"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {uploading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
