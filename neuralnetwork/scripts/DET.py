import os
import sys
import numpy as np
from matplotlib import pyplot

def Score(SC, th, rate):
	
	score_count = 0.0
	for sc in SC:

		if rate=='FAR':
			
			if float(sc)>=float(th):
				score_count+=1

		elif rate=='FRR':
			if float(sc)<=float(th):
                                score_count+=1


	return round(score_count*100/float(len(SC)),2)

################## MAIN ##################


# 1.- We extract the client and the impostor scores

client_file = open('clients.txt','r')
impostor_file = open('impostors.txt','r')

CL = []

for line in client_file:

	CL.append(line[:-1])

IM = []

for line in impostor_file:

	IM.append(line[:-1])

client_file.close()
impostor_file.close()

# 2.- We extract the FRR and FAR for different thresholds

#thresholds = np.arange(-1,1,0.01)
thresholds = np.arange(0,1,0.005) # Tu ho tens que ajustar entre 0 i 1

FRR = np.zeros(len(thresholds))
FAR = np.zeros(len(thresholds))

for idx,th in enumerate(thresholds):

	FRR[idx] = Score(CL, th,'FRR')
	FAR[idx] = Score(IM, th,'FAR')

# 3. We find the error rate:
#print(FRR)
#print(FAR)

ERR_Idx = np.argwhere(np.diff(np.sign(FAR - FRR)) != 0).reshape(-1) + 0
ERR = round((FAR[ERR_Idx] + FRR[ERR_Idx])/2,2)

FAR=FAR[ERR_Idx-100:ERR_Idx+100]
FRR = FRR[ERR_Idx-100:ERR_Idx+100]

ERR_Idx = np.argwhere(np.diff(np.sign(FAR - FRR)) != 0).reshape(-1) + 0

#print('ERR = {}%'.format(ERR))
	
# 4. We Plot the results
fix, ax = pyplot.subplots()
lin_reg = FAR

ax.plot(FAR,FRR, color = 'royalblue')
ax.plot(FAR, lin_reg, color='darkgray', alpha=0.65, linestyle = 'dashed')
ax.plot(FAR[ERR_Idx], lin_reg[ERR_Idx], 'ro')
ax.legend(['Syamese Network: ERR = {}%'.format(ERR)])

pyplot.xlabel('FAR (%)') 
pyplot.ylabel('FRR (%)') 
pyplot.title('DET Curve')
  
pyplot.grid(True)
pyplot.show() 
