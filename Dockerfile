FROM node:10.16-stretch

RUN apt-get update && apt-get install -y ldap-utils vim openssh-client putty-tools
COPY tests/gomngr.sh /opt/gomngr.sh

RUN mkdir -p /root/genouestaccountmanager
WORKDIR /root/genouestaccountmanager


COPY *.json .bowerrc /root/genouestaccountmanager/
RUN npm install
COPY *.js /root/genouestaccountmanager/

RUN mkdir plugins public routes views tests test manager manager2 config
COPY config/test.json /root/genouestaccountmanager/config
COPY plugins /root/genouestaccountmanager/plugins
COPY public /root/genouestaccountmanager/public
COPY routes /root/genouestaccountmanager/routes
COPY views /root/genouestaccountmanager/views
COPY tests /root/genouestaccountmanager/tests
COPY test /root/genouestaccountmanager/test
COPY manager /root/genouestaccountmanager/manager

RUN npm install -g bower
RUN bower install --allow-root
RUN mkdir -p /opt/my/readmes/readmes1
RUN mkdir -p /opt/my/readmes/readmes2
RUN mkdir -p /opt/my/scripts
RUN mkdir -p /opt/my/plugin-scripts

COPY manager2 /root/genouestaccountmanager/manager2
RUN npm install -g @angular/cli@7.0.3
RUN cd /root/genouestaccountmanager/manager2 && npm install && ng build --base-href /manager2/ --prod && rm -rf src && rm -rf node_modules

ENTRYPOINT node app.js
