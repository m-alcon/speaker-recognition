import os
import sys
import numpy as np
import matplotlib
from matplotlib import pyplot
from matplotlib import mlab

def list_to_array(lista):

	array = np.zeros(len(lista))

	count = 0.0

	for idx, a in enumerate(lista):

		array[idx] = float(a)
		count+=array[idx]

	return array

################## MAIN ##################

# 1.- We extract the client and the impostor scores

client_file = open('../data/results/clients.txt','r')
impostor_file = open('../data/results/impostors.txt','r')

CL = []

for line in client_file:

	CL.append(line[:-1])

IM = []

for line in impostor_file:

	IM.append(line[:-1])

client_file.close()
impostor_file.close()

# 2. We transform the lists to arraus

clients = list_to_array(CL)
impostors = list_to_array(IM)

mu_cl = np.mean(clients)
std_cl = np.std(clients)

mu_im = np.mean(impostors)
std_im = np.std(impostors)

# 3. We Plot the Histograms

fig, ax = pyplot.subplots()

bins = np.linspace(0,1,60)   ######### Aixo ho tens que canviar a valors de 0 a 1.

ax.hist(clients, bins, color='royalblue', alpha = 0.65, label = 'Clients: $\mu={}$, $\sigma={}$'.format(round(mu_cl,2),round(std_cl,2)), stacked=True, normed = True)
ax.hist(impostors, bins, color='coral', alpha = 0.65, label = 'Impostors: $\mu={}$, $\sigma={}$'.format(round(mu_im,2),round(std_im,2)), stacked= True, normed = True)

# ax.plot(bins, mlab.normpdf(bins, mu_cl, std_cl),color = 'b', linestyle='dashed')
# ax.plot(bins, mlab.normpdf(bins, mu_im, std_im),color = 'orangered', linestyle='dashed')

#pyplot.title('Histograma dels resultats')
pyplot.legend()
#pyplot.grid(True)
pyplot.show()
