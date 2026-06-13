import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import JobForm from '../components/jobs/JobForm';
import ApplicationList from '../components/jobs/ApplicationList';

export default function AdminDashboard() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [editingJob, setEditingJob] = useState(null); // null = list, 'new' = create, job object = edit
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin', { replace: true });
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, appsData] = await Promise.all([
        apiFetch('/admin/jobs'),
        apiFetch('/admin/applications')
      ]);
      setJobs(jobsData);
      setApplications(appsData);
    } catch (err) {
      console.error(err);
      if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
        logout();
        navigate('/admin', { replace: true });
      }
    }
    setLoading(false);
  };

  const handleSaveJob = async (formData) => {
    if (editingJob === 'new') {
      await apiFetch('/admin/jobs', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
    } else {
      await apiFetch(`/admin/jobs/${editingJob.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
    }
    setEditingJob(null);
    await loadData();
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Delete this job posting and all its applications?')) return;
    await apiFetch(`/admin/jobs/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  if (!isAuthenticated) return null;

  return (
    <section className="py-12 lg:py-16">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-playfair text-[#2C2B29]">Admin Dashboard</h1>
            <p className="text-stone-500 font-montserrat font-light text-base mt-1">Manage jobs and applications</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-stone-500 hover:text-stone-900 font-montserrat transition-colors flex items-center gap-1">
            <iconify-icon icon="solar:logout-2-linear" className="text-lg"></iconify-icon>
            Sign Out
          </button>
        </div>

        <div className="flex gap-1 mb-8 bg-stone-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setTab('jobs'); setEditingJob(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-montserrat font-medium transition-all ${tab === 'jobs' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setTab('applications')}
            className={`px-5 py-2 rounded-lg text-sm font-montserrat font-medium transition-all ${tab === 'applications' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Applications ({applications.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-[#827A71] rounded-full animate-spin"></div>
          </div>
        ) : tab === 'jobs' ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
            {editingJob ? (
              <div className="p-8">
                <h2 className="text-xl font-playfair text-[#2C2B29] mb-6">
                  {editingJob === 'new' ? 'Create New Job' : `Edit: ${editingJob.title}`}
                </h2>
                <JobForm
                  job={editingJob === 'new' ? null : editingJob}
                  onSave={handleSaveJob}
                  onCancel={() => setEditingJob(null)}
                />
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                  <h2 className="text-lg font-playfair text-[#2C2B29]">Job Postings</h2>
                  <button
                    onClick={() => setEditingJob('new')}
                    className="bg-[#817872] text-white rounded-lg px-4 py-2 text-sm font-normal hover:bg-stone-800 transition-colors flex items-center gap-1"
                  >
                    <iconify-icon icon="solar:add-circle-linear" className="text-lg"></iconify-icon>
                    New Job
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div className="text-center py-16 text-stone-500 font-montserrat font-light">
                    No jobs yet. Create your first job posting.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {jobs.map(job => (
                      <div key={job.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-normal text-stone-900">{job.title}</h3>
                            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${job.is_active ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                              {job.is_active ? 'Active' : 'Draft'}
                            </span>
                          </div>
                          <p className="text-sm text-stone-500 font-montserrat font-light">
                            {job.location} &middot; {job.type} {job.pay_range && `· ${job.pay_range}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingJob(job)}
                            className="p-2 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                          >
                            <iconify-icon icon="solar:pen-linear" className="text-lg"></iconify-icon>
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <iconify-icon icon="solar:trash-bin-trash-linear" className="text-lg"></iconify-icon>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-playfair text-[#2C2B29] mb-6">Applications</h2>
            <ApplicationList applications={applications} />
          </div>
        )}
      </div>
    </section>
  );
}
