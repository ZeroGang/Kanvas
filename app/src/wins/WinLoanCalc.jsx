import React, { useState } from 'react';
import WinModal from './WinModal';

export default function WinLoanCalc({ isOpen, onClose }) {
  const [loanMode, setLoanMode] = useState('commercial');
  const [loanAmount, setLoanAmount] = useState(33);
  const [loanCommercialAmount, setLoanCommercialAmount] = useState(70);
  const [loanCommercialRate, setLoanCommercialRate] = useState(3.05);
  const [loanFundAmount, setLoanFundAmount] = useState(30);
  const [loanFundRate, setLoanFundRate] = useState(2.85);
  const [loanYears, setLoanYears] = useState(10);
  const [loanRepayType, setLoanRepayType] = useState('equal_payment');
  const [loanResult, setLoanResult] = useState(null);

  const calculateLoan = () => {
    let totalAmount, rate;
    if (loanMode === 'commercial') {
      totalAmount = parseFloat(loanAmount) * 10000;
      rate = parseFloat(loanCommercialRate) / 100 / 12;
    } else if (loanMode === 'fund') {
      totalAmount = parseFloat(loanFundAmount) * 10000;
      rate = parseFloat(loanFundRate) / 100 / 12;
    } else {
      const cAmt = parseFloat(loanCommercialAmount) * 10000;
      const cRate = parseFloat(loanCommercialRate) / 100 / 12;
      const fAmt = parseFloat(loanFundAmount) * 10000;
      const fRate = parseFloat(loanFundRate) / 100 / 12;
      totalAmount = cAmt + fAmt;
      rate = (cAmt * cRate + fAmt * fRate) / totalAmount;
    }
    const months = parseInt(loanYears) * 12;
    let monthlyPayment, totalInterest, totalPayment;

    if (loanRepayType === 'equal_payment') {
      const factor = Math.pow(1 + rate, months);
      monthlyPayment = (totalAmount * rate * factor) / (factor - 1);
      totalPayment = monthlyPayment * months;
      totalInterest = totalPayment - totalAmount;
    } else {
      const principalPerMonth = totalAmount / months;
      let interestSum = 0;
      let remaining = totalAmount;
      for (let i = 0; i < months; i++) {
        const interest = remaining * rate;
        interestSum += interest;
        remaining -= principalPerMonth;
      }
      totalInterest = interestSum;
      totalPayment = totalAmount + totalInterest;
      monthlyPayment = totalPayment / months;
    }

    setLoanResult({
      totalAmount,
      monthlyPayment,
      totalPayment,
      totalInterest,
    });
  };

  if (!isOpen) return null;

  return (
    <WinModal title="贷款计算器" onClose={onClose} size="large">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            <i className="ph ph-sliders-horizontal" /> 贷款模式
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn ${loanMode === 'commercial' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('commercial')}
            >
              商业贷款
            </button>
            <button
              type="button"
              className={`btn ${loanMode === 'fund' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('fund')}
            >
              公积金贷款
            </button>
            <button
              type="button"
              className={`btn ${loanMode === 'combo' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('combo')}
            >
              组合贷款
            </button>
          </div>

          {loanMode === 'commercial' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-house" /> 贷款金额（万元）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> 年利率（%）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialRate}
                    onChange={e => setLoanCommercialRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          {loanMode === 'fund' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-bank" /> 贷款金额（万元）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundAmount}
                    onChange={e => setLoanFundAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> 年利率（%）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundRate}
                    onChange={e => setLoanFundRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          {loanMode === 'combo' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-building-office" /> 商业贷款金额（万元）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialAmount}
                    onChange={e => setLoanCommercialAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> 商业贷款年利率（%）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialRate}
                    onChange={e => setLoanCommercialRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-bank" /> 公积金贷款金额（万元）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundAmount}
                    onChange={e => setLoanFundAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> 公积金贷款年利率（%）</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundRate}
                    onChange={e => setLoanFundRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div className="filter-group">
              <label><i className="ph ph-calendar" /> 贷款期限（年）</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="filter-input"
                  value={loanYears}
                  onChange={e => setLoanYears(e.target.value)}
                  min="1"
                  max="40"
                  step="1"
                />
                <span>年</span>
              </div>
            </div>
            <div className="filter-group">
              <label><i className="ph ph-arrows-left-right" /> 还款方式</label>
              <select
                className="filter-input"
                value={loanRepayType}
                onChange={e => setLoanRepayType(e.target.value)}
              >
                <option value="equal_payment">等额本息</option>
                <option value="equal_principal">等额本金</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-accent" onClick={calculateLoan}>
              <i className="ph ph-calculator" /> 立即计算
            </button>
          </div>
        </section>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            <i className="ph ph-chart-pie-slice" /> 还款概览
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span><i className="ph ph-money" /> 月供</span>
              <b>{loanResult ? `¥${loanResult.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span><i className="ph ph-stack" /> 总还款</span>
              <b>{loanResult ? `¥${loanResult.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><i className="ph ph-percent" /> 总利息</span>
              <b>{loanResult ? `¥${loanResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            <i className="ph ph-table" /> 还款明细表
          </div>
          <div style={{ background: 'var(--card-bg)', borderRadius: '8px', padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--border)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left' }}>期数</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>月供</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>本金</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>利息</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>剩余</th>
                </tr>
              </thead>
              <tbody>
                {loanResult ? (
                  Array.from({ length: Math.min(12, parseInt(loanYears) * 12) }).map((_, i) => {
                    const totalAmount = loanResult.totalAmount;
                    const rate = (loanMode === 'commercial' ? parseFloat(loanCommercialRate) : parseFloat(loanFundRate)) / 100 / 12;
                    const remaining = loanResult.totalAmount;
                    const principalPerMonth = totalAmount / (parseInt(loanYears) * 12);
                    const interest = remaining * rate;
                    return (
                      <tr key={i}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>第{i + 1}期</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          ¥{(principalPerMonth + interest).toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          ¥{principalPerMonth.toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          ¥{interest.toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                          ¥{(totalAmount - principalPerMonth * (i + 1)).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>请先计算</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WinModal>
  );
}
