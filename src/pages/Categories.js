import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/styles/Budget.css';

function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'expense', description: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'expense', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      setError('Failed to fetch categories');
    }
    setLoading(false);
  };

  const handleInputChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = e => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Only send the name, type, and description as entered, do not append type to name
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description
      };
      const res = await fetch('http://localhost:5000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create category');
      setForm({ name: '', type: 'expense', description: '' });
      fetchCategories();
    } catch (err) {
      setError('Failed to create category');
    }
    setLoading(false);
  };

  const handleEdit = cat => {
    setEditId(cat._id);
    setEditForm({ name: cat.name, type: cat.type, description: cat.description });
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/categories/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Failed to update category');
      setEditId(null);
      fetchCategories();
    } catch (err) {
      setError('Failed to update category');
    }
    setLoading(false);
  };

  const handleDelete = async id => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      fetchCategories();
    } catch (err) {
      setError('Failed to delete category');
    }
    setLoading(false);
  };

  return (
    <div className="budget-container">
      <h1 className="budget-title">{t('category.type')}</h1>
      <form className="budget-form" onSubmit={handleSubmit} style={{ marginBottom: '2em', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
        <input className="budget-input" type="text" name="name" value={form.name} onChange={handleInputChange} placeholder={t('category.name') || 'Category name'} required style={{ flex: 1, minWidth: '140px' }} />
        <select className="budget-input" name="type" value={form.type} onChange={handleInputChange} required style={{ flex: 1, minWidth: '140px' }}>
          <option value="expense">{t('category.expense')}</option>
          <option value="income">{t('category.income')}</option>
        </select>
        <input className="budget-input" type="text" name="description" value={form.description} onChange={handleInputChange} placeholder={t('transaction.description')} style={{ flex: 2, minWidth: '180px' }} />
        <button className="budget-btn" type="submit" style={{ flex: 1, minWidth: '120px' }}>{t('category.add')}</button>
      </form>
      {error && <div className="budget-empty">{error}</div>}
      <div className="budget-list">
        {loading ? <div className="budget-empty">Loading...</div> : categories.length === 0 ? (
          <div className="budget-empty">No categories found</div>
        ) : (
          categories.map(cat => (
            <div className="budget-card" key={cat._id}>
              {editId === cat._id ? (
                <form className="budget-form" onSubmit={handleEditSubmit} style={{ marginBottom: '1em' }}>
                  <input className="budget-input" type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
                  <select className="budget-input" name="type" value={editForm.type} onChange={handleEditInputChange} required>
                    <option value="expense">{t('category.expense')}</option>
                    <option value="income">{t('category.income')}</option>
                  </select>
                  <input className="budget-input" type="text" name="description" value={editForm.description} onChange={handleEditInputChange} />
                  <button className="budget-btn" type="submit">{t('form.save')}</button>
                  <button className="budget-btn" type="button" onClick={() => setEditId(null)}>{t('form.cancel')}</button>
                </form>
              ) : (
                <>
                  <h3>{cat.name}</h3>
                  <p>{t('category.type')}: {t(`category.${cat.type}`) || cat.type}</p>
                  <p>{t('transaction.description')}: {cat.description}</p>
                  <div className="budget-actions">
                    <button className="budget-btn" onClick={() => handleEdit(cat)}>{t('form.edit')}</button>
                    <button className="budget-btn" onClick={() => handleDelete(cat._id)}>{t('form.delete')}</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Categories;
