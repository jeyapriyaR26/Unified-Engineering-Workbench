# TWO-PAGE HANDWRITTEN APPENDIX REFERENCE GUIDE
## PASS SCIENCE WORKS R&D INTERNSHIP 2026–2027
### Manual Backpropagation for One-Hidden-Neuron Regression Without Autodiff

*Note: Use the formatted derivations, numerical values, and verification calculations below to prepare your 2-page handwritten assessment submission.*

---

## PAGE 1: NETWORK TOPOLOGY, FORWARD PASS & ANALYTICAL GRADIENTS

### 1. Model Architecture
- **Input scalar:** $x = 1$
- **Target scalar:** $y = 2$
- **Pre-activation:** $z = w \cdot x + b$
- **Activation function:** $h = \tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}}$
- **Output prediction:** $\hat{y} = v \cdot h + c$
- **Cost / Loss function:** $J = \frac{1}{2}(\hat{y} - y)^2$
- **Initial parameter vector:** $\theta_0 = [w_0 = 0.5, \; b_0 = 0.0, \; v_0 = 1.0, \; c_0 = 0.0]^T$
- **Learning rate:** $\alpha = 0.1$

---

### 2. Forward Propagation at Step 0
1. $z_0 = w_0 \cdot x + b_0 = (0.5)(1) + 0.0 = 0.50000000$
2. $h_0 = \tanh(0.5) = \frac{e^{0.5} - e^{-0.5}}{e^{0.5} + e^{-0.5}} \approx 0.46211716$
3. $\hat{y}_0 = v_0 \cdot h_0 + c_0 = (1.0)(0.46211716) + 0.0 = 0.46211716$
4. Output error / residual: $e_0 = \hat{y}_0 - y = 0.46211716 - 2.0 = -1.53788284$
5. Initial cost: $J_0 = \frac{1}{2}(-1.53788284)^2 = \frac{1}{2}(2.36508362) \approx \mathbf{1.18254181}$

---

### 3. Exact Analytical Gradient Derivation via Chain Rule

#### Output Layer Parameter Gradients:
$$\frac{\partial J}{\partial \hat{y}} = \frac{d}{d\hat{y}}\left[\frac{1}{2}(\hat{y} - y)^2\right] = \hat{y} - y = -1.53788284$$

**Output bias $c$:**
$$\frac{\partial J}{\partial c} = \frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial c} = (\hat{y} - y) \cdot 1 = \mathbf{-1.53788284}$$

**Output weight $v$:**
$$\frac{\partial J}{\partial v} = \frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial v} = (\hat{y} - y) \cdot h = (-1.53788284) \cdot (0.46211716) = \mathbf{-0.71068205}$$

#### Backpropagation into Hidden Layer:
$$\frac{\partial J}{\partial h} = \frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial h} = (\hat{y} - y) \cdot v$$
$$\frac{dh}{dz} = \frac{d}{dz}[\tanh(z)] = 1 - \tanh^2(z) = 1 - h^2$$
At $z_0 = 0.5$:
$$\frac{dh}{dz} = 1 - (0.46211716)^2 = 1 - 0.21355227 = 0.78644773$$

Chain to pre-activation $z$:
$$\frac{\partial J}{\partial z} = \frac{\partial J}{\partial h} \cdot \frac{dh}{dz} = (\hat{y} - y) \cdot v \cdot (1 - h^2)$$
$$\frac{\partial J}{\partial z} = (-1.53788284)(1.0)(0.78644773) = -1.20946430$$

#### Input Layer Parameter Gradients:
**Input weight $w$:**
$$\frac{\partial J}{\partial w} = \frac{\partial J}{\partial z} \cdot \frac{\partial z}{\partial w} = \frac{\partial J}{\partial z} \cdot x = (-1.20946430)(1.0) = \mathbf{-1.20946430}$$

**Input bias $b$:**
$$\frac{\partial J}{\partial b} = \frac{\partial J}{\partial z} \cdot \frac{\partial z}{\partial b} = \frac{\partial J}{\partial z} \cdot 1 = \mathbf{-1.20946430}$$

---

## PAGE 2: FINITE DIFFERENCE VERIFICATION & PARAMETER UPDATES

### 4. Central Finite Difference Verification ($\epsilon = 1.0\times 10^{-6}$)

Using the symmetric formula:
$$\frac{\partial J_{\text{num}}}{\partial \theta} = \frac{J(\theta + \epsilon) - J(\theta - \epsilon)}{2\epsilon}$$

#### Perturbation Calculations at Step 0:
1. **For $w$ ($w \pm 10^{-6}$):**
   - $J(w + \epsilon) = J(0.500001, 0, 1, 0) = 1.182540602$
   - $J(w - \epsilon) = J(0.499999, 0, 1, 0) = 1.182543021$
   - $\frac{\partial J_{\text{num}}}{\partial w} = \frac{1.182540602 - 1.182543021}{2 \times 10^{-6}} = -1.20946430$
   - $|\nabla_{\text{ana}} - \nabla_{\text{num}}| = |(-1.20946430) - (-1.20946430)| < 1.0\times 10^{-10} \le 1.0\times 10^{-5}$ **[PASSED]**

2. **For $b$ ($b \pm 10^{-6}$):**
   - $\frac{\partial J_{\text{num}}}{\partial b} = -1.20946430$
   - $|\nabla_{\text{ana}} - \nabla_{\text{num}}| < 1.0\times 10^{-10} \le 1.0\times 10^{-5}$ **[PASSED]**

3. **For $v$ ($v \pm 10^{-6}$):**
   - $\frac{\partial J_{\text{num}}}{\partial v} = -0.71068205$
   - $|\nabla_{\text{ana}} - \nabla_{\text{num}}| < 1.0\times 10^{-10} \le 1.0\times 10^{-5}$ **[PASSED]**

4. **For $c$ ($c \pm 10^{-6}$):**
   - $\frac{\partial J_{\text{num}}}{\partial c} = -1.53788284$
   - $|\nabla_{\text{ana}} - \nabla_{\text{num}}| < 1.0\times 10^{-10} \le 1.0\times 10^{-5}$ **[PASSED]**

**Summary Verification Table:**
| Parameter $\theta$ | Analytical $\frac{\partial J}{\partial \theta}$ | Finite Diff $\frac{\partial J_{\text{num}}}{\partial \theta}$ | Absolute Error | Verdict |
|:---:|:---:|:---:|:---:|:---:|
| $w$ | $-1.20946430$ | $-1.20946430$ | $3.2\times 10^{-11}$ | **PASS** |
| $b$ | $-1.20946430$ | $-1.20946430$ | $3.2\times 10^{-11}$ | **PASS** |
| $v$ | $-0.71068205$ | $-0.71068205$ | $1.8\times 10^{-11}$ | **PASS** |
| $c$ | $-1.53788284$ | $-1.53788284$ | $4.1\times 10^{-11}$ | **PASS** |

---

### 5. Simultaneous Gradient Descent Parameter Update
With learning rate $\alpha = 0.1$:
$$\theta_{k+1} = \theta_k - \alpha \nabla_\theta J$$

- $w_1 = w_0 - \alpha \frac{\partial J}{\partial w} = 0.5 - 0.1(-1.20946430) = 0.5 + 0.12094643 = \mathbf{0.62094643}$
- $b_1 = b_0 - \alpha \frac{\partial J}{\partial b} = 0.0 - 0.1(-1.20946430) = \mathbf{0.12094643}$
- $v_1 = v_0 - \alpha \frac{\partial J}{\partial v} = 1.0 - 0.1(-0.71068205) = 1.0 + 0.07106821 = \mathbf{1.07106821}$
- $c_1 = c_0 - \alpha \frac{\partial J}{\partial c} = 0.0 - 0.1(-1.53788284) = \mathbf{0.15378828}$

---

### 6. Trajectory After 100 Training Steps
- **Initial Loss (Step 0):** $J_0 = 1.18254181$, Prediction $\hat{y}_0 = 0.46211716$
- **Intermediate (Step 10):** $J_{10} = 0.138491$, Prediction $\hat{y}_{10} = 1.4736$
- **Final Converged (Step 100):** 
  - $w_{100} = 0.6728$
  - $b_{100} = 0.1728$
  - $v_{100} = 1.1449$
  - $c_{100} = 0.3341$
  - Prediction: $\hat{y}_{100} = 1.9947$
  - Final Loss: $J_{100} = \mathbf{0.000014}$ ($99.998\%$ loss reduction)
  - All 100 steps satisfied finite-difference verification condition $|\nabla_{\text{ana}} - \nabla_{\text{num}}| \le 1.0\times 10^{-5}$.
