const common = require('./common');
const ether = require('./ether');
const mtEther = require('./mtEther');
const dhcrypt = require('./dhcrypt');
const mtUtil = require('./mtUtil');
const autoVersion = require('./autoVersion');
const ethUtils = require('ethereumjs-util');
const Buffer = require('buffer/').Buffer;
const BN = require("bn.js");



document.addEventListener('DOMContentLoaded', function() {
    console.log('content loaded');
    console.log('window.innerWidth = ' + window.innerWidth);
    console.log('window.innerHeight = ' + window.innerHeight);
    index.main();
});


const index = module.exports = {
    privateKey: null,
    addrList: [],
    addrListElems: [],
    validAddrs: [],
    recipients: [],
    filterFeeBN: null,
    filterBalanceBN: null,
    filterActivity: null,
    filterRequireENS: false,
    noAddrsMsg: null,
    totalFeesBN: null,
    elemIdx: -1,

    main: function() {
	setOptionsButtonHandlers();
	setMainButtonHandlers();
	beginTheBeguine('startup');
    },

};

function AddrInfo(idx, addr) {
    this.idx = idx;
    this.addr = addr;
    this.feeBN = null;
    this.balanceBN = null;
    this.activity = null;
    this.ensName = null;
    this.valid = null;
    this.sendable = false;
}

function AddrElem(div, addrNoArea, addrArea, validArea, feeArea, balanceArea, activityArea, sendArea, addrNo) {
    this.div = div;
    this.addrNoArea = addrNoArea;
    this.addrArea = addrArea;
    this.validArea = validArea;
    this.feeArea = feeArea;
    this.balanceArea = balanceArea;
    this.activityArea = activityArea;
    this.sendArea = sendArea;
    this.addrNo = addrNo;
    this.elemIdx = -1;
}


function setOptionsButtonHandlers() {
    const versionArea = document.getElementById('versionArea');
    versionArea.textContent = 'Build: ' + autoVersion.version();
    const optionsButton = document.getElementById('optionsButton');
    optionsButton.addEventListener('click', () => { common.replaceElemClassFromTo('optionsPanel', 'hidden', 'visibleB', null); });
    const closeOptionsButton = document.getElementById('closeOptionsButton');
    closeOptionsButton.addEventListener('click', () => {
	common.replaceElemClassFromTo('optionsPanel', 'visibleB', 'hidden', null);
	if (localStorage['logsNodeType'] != ether.nodeType)
	    ether.nodeType = localStorage['logsNodeType'];
	if (localStorage['logsCustomNode'] != ether.node)
	    ether.node = localStorage['logsCustomNode'];
    });
    const marysThemeButton = document.getElementById('marysThemeButton');
    const wandasThemeButton = document.getElementById('wandasThemeButton');
    const relaxThemeButton = document.getElementById('relaxThemeButton');
    const themedStyle = document.getElementById('themedStyle');
    const updateThemeFcn = (theme) => {
	localStorage['theme'] = theme;
	if (themedStyle.href.indexOf('marys-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('marys-style', localStorage['theme']);
	if (themedStyle.href.indexOf('wandas-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('wandas-style', localStorage['theme']);
	if (themedStyle.href.indexOf('relax-style') >= 0)
	    themedStyle.href = themedStyle.href.replace('relax-style', localStorage['theme']);
    };
    if (!!localStorage['theme'] && localStorage['theme'].indexOf('wanda') >= 0) {
	wandasThemeButton.checked = true;
	updateThemeFcn('wandas-style');
    } else if (!!localStorage['theme'] && localStorage['theme'].indexOf('mary') >= 0) {
	marysThemeButton.checked = true;
	updateThemeFcn('marys-style');
    } else {
	relaxThemeButton.checked = true;
	updateThemeFcn('relax-style');
    }
    marysThemeButton.addEventListener('click', () => {	updateThemeFcn('marys-style'); });
    wandasThemeButton.addEventListener('click', () => { updateThemeFcn('wandas-style'); });
    relaxThemeButton.addEventListener('click', () => { updateThemeFcn('relax-style'); });
    //
    // display/update store messages: blockchain/swarm
    //
    const storeMsgsSelect = document.getElementById('storeMsgsSelect');
    const storeMsgsSelectFcn = () => {
	localStorage['storeMessages'] = storeMsgsSelect.value;
	mtUtil.setMessageStorage(localStorage['storeMessages'], localStorage['swarmGateway']);
	common.replaceElemClassFromTo('swarmGatewayViewButton', 'visibleB', 'hidden', true);
	if (storeMsgsSelect.value == 'swarm' || storeMsgsSelect.value == 'auto') {
	    common.replaceElemClassFromTo('swarmGatewayDiv', 'hidden', 'visibleB', false);
	} else {
	    common.replaceElemClassFromTo('swarmGatewayDiv', 'visibleB', 'hidden', true);
	    document.getElementById('noteDialogIntro').textContent =
		'You have selected to store messages on the Ethereum blockchain (as event logs). ' +
		'This is the most reliable way to store messages -- however, this is also the ' +
		'most expensive way to store large messages (about 300K gas for a 1KB message).';
	    document.getElementById('noteDialogNote').textContent =
		'Also, note that messages stored this way are limited in size to about 25KB ' +
		'(because of the Ethereum block gas-limit).';
	    common.replaceElemClassFromTo('noteDialogDiv', 'noteDialogLarge', 'noteDialogSmall', true);
	    common.replaceElemClassFromTo('noteDialogDiv', 'hidden', 'visibleB', true);
	}
    };
    if (!localStorage['storeMessages'])
	localStorage['storeMessages'] = 'ethereum';
    storeMsgsSelect.value = localStorage['storeMessages'];
    if (storeMsgsSelect.value == 'swarm' || storeMsgsSelect.value == 'auto')
	common.replaceElemClassFromTo('swarmGatewayViewButton', 'hidden', 'visibleB', false);
    const swarmGatewayDoFcn = () => {
	common.replaceElemClassFromTo('swarmGatewayDiv', 'visibleB', 'hidden', true);
	common.replaceElemClassFromTo('swarmGatewayViewButton', 'hidden', 'visibleB', false);
	localStorage['swarmGateway'] = document.getElementById('swarmGatewayArea').value;
	mtUtil.setMessageStorage(localStorage['storeMessages'], localStorage['swarmGateway']);
	document.getElementById('noteDialogIntro').textContent = (mtUtil.storageMode == 'swarm')
	    ? 'You have selected to store messages on Swarm. Every messages is still encrypted, ' +
	    'and its hash is stored on the the Ethereum blockchain (as an event log). This means ' +
	    'that no matter the size of the message (including any attachment), the gas that is ' +
	    'consumed will always be the same.'
	    : 'You have selected to store messages on the Ethereum blockchain (as event logs), ' +
	    'except those messages that have attachments, which will be stored on Swarm.';
	document.getElementById('noteDialogNote').textContent = (mtUtil.storageMode == 'swarm')
	    ? 'However, please note Swarm is still experimental. Messages stored on Swarm could ' +
	    'disappear without warning. Also, Swarm gateways impose filesize limitations which ' +
	    'might prevent successful uploading, or cause sporadic "timeouts" when downloading ' +
	    'large messages.'
	    : 'Messages stored on the Ethereum blockchain will persist forever. However for ' +
	    'messages with attachments, please note that Swarm is still experimental. And messages ' +
	    'stored on Swarm could disappear without warning. Also, Swarm gateways impose filesize ' +
	    'limitations which might prevent successful uploading, or cause sporadic "timeouts" ' +
	    'when downloading large messages.';
	common.replaceElemClassFromTo('noteDialogDiv', 'noteDialogSmall', 'noteDialogLarge', true);
	common.replaceElemClassFromTo('noteDialogDiv', 'hidden', 'visibleB', true);
    };
    if (!localStorage['swarmGateway'])
	localStorage['swarmGateway'] = 'https://swarm-gateways.net';
    mtUtil.setMessageStorage(localStorage['storeMessages'], localStorage['swarmGateway']);
    document.getElementById('swarmGatewayArea').value = localStorage['swarmGateway'];
    storeMsgsSelect.addEventListener('change', storeMsgsSelectFcn);
    document.getElementById('swarmGatewayDoButton').addEventListener('click', swarmGatewayDoFcn);
    document.getElementById('swarmGatewayViewButton').addEventListener('click', storeMsgsSelectFcn);
    //
    // swarm timeout (for downloads)
    //
    const swarmTimeoutSelect = document.getElementById('swarmTimeoutSelect');
    if (!localStorage['swarmTimeout'])
	localStorage['swarmTimeout'] = '4000';
    swarmTimeoutSelect.value = localStorage['swarmTimeout'];
    const swarmTimeoutSelectFcn = () => {
	localStorage['swarmTimeout'] = swarmTimeoutSelect.value;
	mtUtil.setSwarmTimeout(localStorage['swarmTimeout']);
    };
    swarmTimeoutSelect.addEventListener('change', swarmTimeoutSelectFcn);
}


function setMainButtonHandlers() {
    const noteDialogOkButton = document.getElementById('noteDialogOkButton');
    noteDialogOkButton.addEventListener('click', function() {
	common.replaceElemClassFromTo('noteDialogDiv', 'visibleB', 'hidden', true);
    });

    //
    // private key
    //
    console.log('setMainButtonHandlers');
    document.getElementById('privateKeyButton').addEventListener('click', function() {
	document.getElementById('privateKeyInput').value = '';
	document.getElementById('privateKeyInput').placeholder = (!!index.privateKey)
	    ? 'Private key is already set; Press Cancel to leave it un-changed.'
	    : 'Enter the private key for your acct';
	common.replaceElemClassFromTo('privateKeyDiv', 'hidden', 'visibleB', true);
    });
    document.getElementById('privateKeyCancel').addEventListener('click', function() {
	common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
    });
    document.getElementById('privateKeySave').addEventListener('click', function() {
	const key = document.getElementById('privateKeyInput').value;
	console.log('private key = ' + key);
	if (!key) {
	    index.privateKey = '';
	    document.getElementById('privateKeyButton').innerHTML = 'Enter Private Key';
	    common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
	} else {
	    ether.privateKeyToAddr(key, (err, addr) => {
		if (!!err)
		    alert('Private key is not valid: ' + err);
		else if (addr.toLowerCase() != common.web3.eth.accounts[0].toLowerCase())
		    alert('Private key does not match currently selected MetaMask account');
		else {
		    index.privateKey = key;
		    common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
		    document.getElementById('privateKeyButton').innerHTML = 'Private Key&nbsp;&nbsp;<i class="material-icons">done</i>';
		    common.setMenuButtonState('loadAddrFileButton', 'Enabled');
		    const msg = (index.addrList.length > 0) ? index.noAddrsMsg : 'You need to load an address file...';
		    showStatus(msg);
		}
	    });
	}
    });
    //
    // load addresses
    //
    document.getElementById('loadAddrFileButton').addEventListener('click', function() {
	attachmentInput.value = attachmentInput.files = null;
	common.replaceElemClassFromTo('loadAddrFileDiv', 'hidden', 'visibleB', false);
    });
    document.getElementById('loadAddrFileCancel').addEventListener('click', function() {
	if (index.addrList.length == 0)
	    document.getElementById('loadAddrFileButton').innerHTML = 'Load Address File';
	common.replaceElemClassFromTo('loadAddrFileDiv', 'visibleB', 'hidden', true);
    });
    const loadAddrFileInput = document.getElementById('loadAddrFileInput');
    loadAddrFileInput.addEventListener('change', function() {
	console.log('loadFileInput: got change event');
	if (loadAddrFileInput.files && loadAddrFileInput.files[0]) {
	    console.log('loadFileInput: got ' + loadAddrFileInput.files[0].name);
            const reader = new FileReader();
            reader.onload = (e) => {
		//eg. e.target.result =
		// 0x02c9bde73f3a7b2e6504eb6ee49c9e508c824bc4
		// 0x02cdd1816be8ae088c54b0a85d5deb7d0f215e06
		// 0x02d6f68273182c0a0b2cc8c09f479e0e6136af5a
		// ...
		//console.log('attachmentInput: e.target.result = ' + e.target.result);
		common.replaceElemClassFromTo('loadAddrFileDiv', 'visibleB', 'hidden', true);
		index.addrList = [];
		index.addrListElems = [];
		index.validAddrs = [];
		index.recipients = [];
		common.clearDivChildren(document.getElementById('addrListDiv'));
		parseAddrs(e.target.result, 0, () => {
		    document.getElementById('loadAddrFileButton').innerHTML = 'Address File&nbsp;&nbsp;<i class="material-icons">done</i>';
		    populateAddrList(0);
		    fillAddrInfoNext(0, () => {
			common.setMenuButtonState('setFiltersButton', 'Enabled');
			index.noAddrsMsg = 'number of addresses: ' + index.addrList.length.toString(10) + ' (' + index.validAddrs.length.toString(10) + ' valid)';
			document.getElementById('setFiltersButton').innerHTML = 'Set Filters';
			showStatus(index.noAddrsMsg + ' | you must set filters');
			//document.getElementById('addrCountArea').textContent = 'valid addresses: ' + ;
		    });
		});
            };
            reader.readAsText(loadAddrFileInput.files[0]);
        } else {
	    //attachmentSaveA.href = '';
	    //attachmentSaveA.download = '';
	}
    });
    //
    // set filters
    //
    document.getElementById('setFiltersButton').addEventListener('click', function() {
	if (!!index.filterFeeBN) {
	    const feeNumberAndUnits = ether.convertWeiBNToNumberAndUnits(index.filterFeeBN);
	    document.getElementById('filterFeeInput').value = feeNumberAndUnits.number;
	    document.getElementById('filterFeeUnits').selectedIndex = feeNumberAndUnits.index;
	}
	if (!!index.filterBalanceBN) {
	    const balanceNumberAndUnits = ether.convertWeiBNToNumberAndUnits(index.filterBalanceBN);
	    document.getElementById('filterBalanceInput').value = balanceNumberAndUnits.number;
	    document.getElementById('filterBalanceUnits').selectedIndex = balanceNumberAndUnits.index;
	}
	if (!!index.filterActivity)
	    document.getElementById('filterActivityInput').value = index.filterActivity.toString(10);
	document.getElementById('filterRequireENS').checked = index.filterRequireENS;
	common.replaceElemClassFromTo('filtersDiv', 'hidden', 'visibleB', false);
    });
    document.getElementById('filtersCancel').addEventListener('click', function() {
	common.replaceElemClassFromTo('filtersDiv', 'visibleB', 'hidden', true);
    });
    document.getElementById('filtersSave').addEventListener('click', function() {
	const feeValue = document.getElementById('filterFeeInput').value;
	const feeUnitsValue = document.getElementById('filterFeeUnits').value;
	index.filterFeeBN = (!!feeValue) ? common.decimalAndUnitsToBN(feeValue, feeUnitsValue) : null;
	if (!!feeValue && index.filterFeeBN === null) {
	    alert('Error Unable to parse Maximum Fee filter');
	    return;
	}
	console.log('filter fee = ' + ((!!index.filterFeeBN) ? index.filterFeeBN.toString(10) : 'null'));
	const balanceValue = document.getElementById('filterBalanceInput').value;
	const balanceUnitsValue = document.getElementById('filterBalanceUnits').value;
	index.filterBalanceBN = (!!balanceValue) ? common.decimalAndUnitsToBN(balanceValue, balanceUnitsValue) : null;
	if (!!balanceValue && index.filterBalanceBN === null) {
	    alert('Error Unable to parse Minimum Balance filter');
	    return;
	}
	console.log('filter balance = ' + ((!!index.filterBalanceBN) ? index.filterBalanceBN.toString(10) : 'null'));
	const activityValue = document.getElementById('filterActivityInput').value;
	if (!!activityValue)
	    index.filterActivity = parseInt(activityValue);
	const requireENS = document.getElementById('filterRequireENS').checked;
	console.log('filter requireENS = ' + requireENS);
	index.filterRequireENS = requireENS;
	document.getElementById('setFiltersButton').innerHTML = 'Set Filters&nbsp;&nbsp;<i class="material-icons">done</i>';
	showStatus(index.noAddrsMsg + ' | filters set');
	common.replaceElemClassFromTo('filtersDiv', 'visibleB', 'hidden', true);
	findRecipients(() => initMsgArea(true));
    });
    //
    // send
    //
    document.getElementById('sendButton').addEventListener('click', function() {
	common.replaceElemClassFromTo('sendDialogDiv', 'hidden', 'visibleB', true);
    });
    document.getElementById('sendDialogCancelButton').addEventListener('click', function() {
	common.replaceElemClassFromTo('sendDialogDiv', 'visibleB', 'hidden', true);
    });
    document.getElementById('sendDialogOkButton').addEventListener('click', function() {
	common.replaceElemClassFromTo('sendDialogDiv', 'visibleB', 'hidden', true);
	doSend();
    });
    //
    // addr list scroll
    //
    const addrListDiv = document.getElementById('addrListDiv');
    addrListDiv.addEventListener('scroll', function() {
        if (!!index.addrList && index.addrListElems.length < index.addrList.length)
	    populateAddrList(null);
    });
}


//
// mode = [ 'startup' | 'send' | 'recv' | null ]
//
async function beginTheBeguine(mode) {
    common.setMenuButtonState('privateKeyButton',   'Disabled');
    common.setMenuButtonState('loadAddrFileButton', 'Disabled');
    common.setMenuButtonState('setFiltersButton',   'Disabled');
    common.setMenuButtonState('sendButton',         'Disabled');
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	index.account = acct;
	if (!!err || !acct) {
	    console.log('beginTheBeguine: checkForMetaMask err = ' + err);
	    handleLockedMetaMask(err);
	} else {
	    console.log('beginTheBeguine: checkForMetaMask acct = ' + acct);
	    handleUnlockedMetaMask(mode);
	}
    });
}


//
// handle locked metamask
//
function handleLockedMetaMask(err) {
    console.log('handleLockedMetaMask: err = ' + err);
    common.setMenuButtonState('sendButton', 'Disabled');
    const networkArea = document.getElementById('networkArea');
    networkArea.value = '';
    const accountArea = document.getElementById('accountArea');
    accountArea.value = '';
    const balanceArea = document.getElementById('balanceArea');
    balanceArea.value = '';
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = '';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
    alert(err);
}


//
// handle unlocked metamask
// displays the users's eth account info; retreives the users DH public key (will be set if the user is
// registered); then continues on to handleRegistered or handleUnregistered.
//
// note: after a transaction is completed we come back to this fcn. the mode parm provides a hint so that
// we can continue with a relevant part of the display.
//
function handleUnlockedMetaMask(mode) {
    console.log('handleUnlockedMetaMask: mode = ' + mode);
    //we can be called from the 'continue' link in waitForTXID, so clear waiting flag. this re-enables the interval
    //timer to check for changed rx/tx counts
    common.waitingForTxid = false;
    index.localStoragePrefix = (common.web3.eth.accounts[0]).substring(2, 10) + '-';
    //
    //
    ether.ensReverseLookup(common.web3.eth.accounts[0], function(err, name) {
	let addrStr = common.web3.eth.accounts[0];
	if (!err && !!name)
	    addrStr = common.abbreviateAddrForEns(common.web3.eth.accounts[0], name, 8);
	document.getElementById('accountArea').value = 'Account: ' + addrStr;
	document.getElementById('accountAreaFull').textContent = common.web3.eth.accounts[0];
    });
    ether.getBalance(common.web3.eth.accounts[0], 'ether', function(err, balance) {
	const balanceArea = document.getElementById('balanceArea');
	console.log('balance (eth) = ' + balance);
	const balanceETH = parseFloat(balance).toFixed(6);
	balanceArea.value = 'Eth Balance: ' + balanceETH.toString(10) + ' Eth';
    });
    ether.getNetwork(function(err, network) {
	const networkArea = document.getElementById('networkArea');
	if (!!err) {
	    networkArea.value = 'Error: ' + err;
	    return;
	}
	networkArea.value = 'Network: ' + network;
	err = mtEther.setNetwork(network);
	if (network.startsWith('Mainnet'))
	    networkArea.className = (networkArea.className).replace('attention', '');
	else if (networkArea.className.indexOf(' attention' < 0))
	    networkArea.className += ' attention';
	if (!!err) {
	    alert(err)
	    return;
	}
	mtUtil.refreshAcctInfo(true, function(err, _acctInfo) {
	    console.log('handleUnlockedMetaMask: mtUtil.acctInfo.msgFee = ' + mtUtil.acctInfo.msgFee);
	    //console.log('handleUnlockedMetaMask: acctInfo: ' + JSON.stringify(mtUtil.acctInfo));
	    //console.log('handleUnlockedMetaMask: publicKey: ' + mtUtil.publicKey);
	    if (!mtUtil.publicKey || mtUtil.publicKey == '0x') {
		handleUnregisteredAcct();
		return;
	    }
	    handleRegisteredAcct(mode);
	});
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct() {
    common.setMenuButtonState('sendButton', 'Disabled');
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'This Ethereum address is not registered';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}



//
// handle registered account
//
function handleRegisteredAcct(mode) {
    console.log('handleRegisteredAcct');
    if (!!mode && !!dhcrypt.dh && mtUtil.publicKey == dhcrypt.publicKey()) {
	displayFeesAndMsgCnt();
    } else {
	//prevent reloading while we're waiting for signature
	common.waitingForTxid = true;
	common.showWaitingForMetaMask(true);
	const encryptedPrivateKey = mtUtil.acctInfo.encryptedPrivateKey;
	dhcrypt.initDH(encryptedPrivateKey, function(err) {
	    common.waitingForTxid = false;
	    common.showWaitingForMetaMask(false);
	    if (!err) {
		initMsgArea(false);
		displayFeesAndMsgCnt();
		showStatus('Begin by entering your private key...');
		common.setMenuButtonState('privateKeyButton',   'Enabled');
		common.setMenuButtonState('loadAddrFileButton', 'Disabled');
		common.setMenuButtonState('setFiltersButton',   'Disabled');
		common.setMenuButtonState('sendButton',         'Disabled');
	    }
	});
    }
}


//
// initMsgArea(enable)
//
function initMsgArea(enable) {
    console.log('initMsgArea');
    if (index.elemIdx >= 0) {
	//unselect any currently selected message
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message) {
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', message.msgNo)) ? '' : 'New';
	    msgElem.div.className = 'msgListItemDiv' + newSuffix;
	}
    }
    index.elemIdx = -1;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = true;
    msgAddrArea.value = '';
    //
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
    common.replaceElemClassFromTo('attachmentButton',   'hidden',    'visibleIB', false);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden', true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    attachmentSaveA.href = '';
    attachmentSaveA.download = '';
    //
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.ref = '0';
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.disabled = enable ? false : true;
    msgTextArea.readonly = "";
    msgTextArea.value = 'Subject: ';
    const attachmentButton = document.getElementById('attachmentButton');
    attachmentButton.disabled = enable ? false : true;
    common.setMenuButtonState('sendButton', enable ? 'Enabled' : 'Disabled');
    //in case user erases subject...
    msgTextArea.placeholder='Type your message here...';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}


//
// parseAddrs(addrlist, endIdx, cb)
// endIdx tells how far we've already parsed, start with 0
//
function parseAddrs(addrList, endIdxNOTUsed, cb) {
    for (let endIdx = 0; endIdx < addrList.length; ) {
	const addrIdx = addrList.indexOf('0x', endIdx)
	if (addrIdx < 0)
	    break;
	showStatus('loading addresses: ' + (index.addrList.length + 1).toString(10));
	endIdx = addrIdx + 42;
	const addr = addrList.slice(addrIdx, endIdx);
	const addrInfo = new AddrInfo(index.addrList.length, addr);
	index.addrList.push(addrInfo);
    }
    cb();
}


//
// fillAddrInfoNext(idx, cb)
// recursivlely collect (and display) all async info for addresses
//
function fillAddrInfoNext(idx, cb) {
    console.log('parseAddrs: idx = ' + idx);
    if (idx >= index.addrList.length) {
	cb();
    } else {
	showStatus('checking address: ' + (idx + 1).toString(10) + ' of ' + index.addrList.length.toString(10));
	const addrInfo = index.addrList[idx];
	fillAddrInfo(addrInfo, () => {
	    setTimeout(fillAddrInfoNext, 500, idx + 1, cb);
	});
    }
}


//
// fill in async values of the passed AddrInfo
// if the corresponding addr elem exists, then display the retreived values
//
function fillAddrInfo(addrInfo, cb) {
    const fillFcn = (addrInfo) => {
	if (index.addrListElems.length > addrInfo.idx) {
	    const elem = index.addrListElems[addrInfo.idx];
	    elem.validArea.value = (addrInfo.valid) ? 'valid' : 'invalid';
	    elem.balanceArea.value = ether.convertWeiBNToComfort(addrInfo.balanceBN, 3);
	    if (!!addrInfo.ensName) {
		const shortAddr = (addrInfo.ensName.length < 16) ? addrInfo.addr : addrInfo.addr.substring(0, 6) + '...' + addrInfo.addr.substring(38);
		elem.addrArea.value = addrInfo.ensName + ' (' + shortAddr + ')';
	    }
	    if (addrInfo.valid) {
		elem.feeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(addrInfo.feeBN);
		elem.activityArea.value = addrInfo.activity.toString(10) + ' messages sent';
		index.validAddrs.push(addrInfo.idx);
		elem.div.className = 'addrListItemDivValid';
	    } else {
		elem.sendArea.value = 'no -- address is not registered';
		elem.div.className = 'addrListItemDiv';
	    }
	}
    }
    ether.ensReverseLookup(addrInfo.addr, function(err, name) {
	if (!err && !!name)
	    addrInfo.ensName = name;
	ether.getBalance(addrInfo.addr, 'wei', function(err, balance) {
	    addrInfo.balanceBN = common.numberToBN(balance);
            mtEther.accountQuery(addrInfo.addr, function(err, acctInfo) {
		addrInfo.valid = (!err && acctInfo.isValid) ? true : false;
		if (addrInfo.valid) {
		    addrInfo.activity = acctInfo.sentMsgCount;
		    mtEther.getPeerMessageCount(addrInfo.addr, common.web3.eth.accounts[0], function(err, msgCount) {
			console.log(msgCount.toString(10) + ' messages have been sent from ' + addrInfo.addr + ' to me');
			addrInfo.feeBN = common.numberToBN((msgCount > 0) ? acctInfo.msgFee : acctInfo.spamFee);
			fillFcn(addrInfo);
			cb();
		    });
		} else {
		    fillFcn(addrInfo);
		    cb();
		}
	    });
	});
    });
}


//
// create sufficient message list elements to accomodate the current scroll position
// the elements are populated synchronously
//
// if minAddrIdx is set, then we continue populating at least until we have retreived that idx
//
function populateAddrList(minAddrIdx) {
    console.log('populateAddrList');
    const addrListDiv = document.getElementById('addrListDiv');
    let callDepth = 0;
    let callCount = 0;
    for (let j = 0; j < 100; ++j) {
	//scrollHeight is the entire height, including the part of the elem that is now viewable because it is scrolled
	//scrollTop is a measurement of the distance from the element's top to its topmost visible content
        console.log('scroll: scrollHeight = ' + addrListDiv.scrollHeight + ', scrollTop = ' + addrListDiv.scrollTop + ', clientHeight = ' + addrListDiv.clientHeight);
	if (index.addrListElems.length >= index.addrList.length)
            break;
	else if (!!minAddrIdx && index.addrListElems.length < minAddrIdx + 1)
	    ;
        else if (addrListDiv.scrollHeight > addrListDiv.scrollTop + addrListDiv.clientHeight + 50)
            break;
	const firstElemIdx = index.addrListElems.length;
	const noElems = Math.min(30, index.addrList.length - index.addrListElems.length);
	const lastElemIdx = firstElemIdx + noElems - 1;
        console.log('populateAddrList: addrListElems.length = ' + index.addrListElems.length + ', noElems = ' + noElems);
	for (let elemIdx = firstElemIdx; elemIdx <= lastElemIdx; ++elemIdx) {
	    const addrElem = makeAddrListElem(elemIdx);
	    index.addrListElems.push(addrElem);
	    addrListDiv.appendChild(addrElem.div);
	}
    }
}

//
// create an addr list element
// some fields might be empty... the elem is not added to any list
//
function makeAddrListElem(elemIdx) {
    console.log('makeAddrListElem');
    const addrInfo = index.addrList[elemIdx];
    let div, addrNoArea, addrArea, feeArea, activityArea, sendArea;
    div = document.createElement("div");
    div.className = 'addrListItemDiv';
    addrNoArea = document.createElement("textarea");
    addrNoArea.className = 'addrListAddrNoArea';
    addrNoArea.rows = 1;
    addrNoArea.readonly = 'readonly';
    addrNoArea.disabled = 'disabled';
    addrNoArea.value = (addrInfo.idx + 1).toString(10);
    addrArea = document.createElement("textarea");
    addrArea.className = 'addrListAddrArea';
    addrArea.rows = 1;
    addrArea.readonly = 'readonly';
    addrArea.disabled = 'disabled';
    addrArea.value = addrInfo.addr;
    validArea = document.createElement("textarea");
    validArea.className = 'addrListValidArea';
    validArea.rows = 1;
    validArea.readonly = 'readonly';
    validArea.disabled = 'disabled';
    validArea.value = (addrInfo.valid === null) ? 'checking' : (addrInfo.valid) ? 'valid' : 'invalid';
    feeArea = document.createElement("textarea");
    feeArea.className = 'addrListFeeArea';
    feeArea.rows = 1;
    feeArea.readonly = 'readonly';
    feeArea.disabled = 'disabled';
    feeArea.value = '';
    balanceArea = document.createElement("textarea");
    balanceArea.className = 'addrListBalanceArea';
    balanceArea.rows = 1;
    balanceArea.readonly = 'readonly';
    balanceArea.disabled = 'disabled';
    balanceArea.value = '';
    activityArea = document.createElement("textarea");
    activityArea.className = 'addrListActivityArea';
    activityArea.rows = 1;
    activityArea.readonly = 'readonly';
    activityArea.disabled = 'disabled';
    activityArea.value = '';
    sendArea = document.createElement("textarea");
    sendArea.className = 'addrListSendArea notBlinking';
    sendArea.rows = 1;
    sendArea.readonly = 'readonly';
    sendArea.disabled = 'disabled';
    sendArea.value = '';
    div.appendChild(addrNoArea);
    div.appendChild(addrArea);
    div.appendChild(validArea);
    div.appendChild(feeArea);
    div.appendChild(balanceArea);
    div.appendChild(activityArea);
    div.appendChild(sendArea);
    const addrElem = new AddrElem(div, addrNoArea, addrArea, validArea, feeArea, balanceArea, activityArea, sendArea, elemIdx);
    /*
    div.addEventListener('click', function() {
    ...
    });
    */
    return(addrElem);
}


//
// findRecipients(cb)
// find recipients from addrList based on filters
//
function findRecipients(cb) {
    index.recipients = [];
    index.totalFeesBN = new BN(0);
    for (let validIdx = 0; validIdx < index.validAddrs.length; ++validIdx) {
	const idx = index.validAddrs[validIdx];
	const addrInfo = index.addrList[idx];
	showStatus(index.noAddrsMsg + ' | filters set | checking recipients: address: ' + idx.toString(10));
	const elem = index.addrListElems[addrInfo.idx];
	if (!!index.filterFeeBN && addrInfo.feeBN.gt(index.filterFeeBN))
	    elem.sendArea.value = 'no -- fee is too high';
	else if (!!index.filterBalanceBN && addrInfo.balanceBN.lt(index.filterBalanceBN))
	    elem.sendArea.value = 'no -- balance is too low';
	else if (!!index.filterActivity && parseInt(addrInfo.activity) < parseInt(index.filterActivity))
	    elem.sendArea.value = 'no -- insufficient activity';
	else if (!!index.filterRequireENS && !addrInfo.ensName)
	    elem.sendArea.value = 'no -- does not have ENS name';
	else {
	    addrInfo.sendable = true;
	    elem.sendArea.value = 'yes';
	    index.totalFeesBN.iadd(addrInfo.feeBN);
	    index.recipients.push(idx);
	}
	const newSuffix = (addrInfo.sendable) ? 'Valid' : '';
	elem.div.className = 'addrListItemDiv' + newSuffix;
    }
    const feeMsg = 'Total Fees: ' + ether.convertWeiBNToComfort(index.totalFeesBN);
    showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + feeMsg);
    cb();
}



//
// kick off the send operation
// starts by calling sendRecipientsWaitCount(sentMsgCtrBN, 0, message, attachmentIdxBN, ...)
//
function doSend() {
    document.getElementById('msgTextArea').disabled = true;
    document.getElementById('attachmentButton').disabled = true;
    common.setMenuButtonState('privateKeyButton',   'Disabled');
    common.setMenuButtonState('loadAddrFileButton', 'Disabled');
    common.setMenuButtonState('setFiltersButton',   'Disabled');
    common.setMenuButtonState('sendButton',         'Disabled');
    //
    // in case we already sent one message, clear the 'sent' status from each recipient
    for (let idx = 0; idx < index.recipients.length; ++idx) {
	const recipientIdx = index.recipients[idx];
	const elem = index.addrListElems[recipientIdx];
	common.replaceClassFromTo(elem.sendArea, 'blinking', 'notBlinking', true);
	elem.sendArea.value = 'yes';
    }
    //
    let message = document.getElementById('msgTextArea').value;
    let attachmentIdxBN;
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    console.log('send: attachmentSaveA.href = ' + attachmentSaveA.href + ', attachmentSaveA.download = ' + attachmentSaveA.download);
    if (!attachmentSaveA.href || !attachmentSaveA.download) {
	attachmentIdxBN = new BN(0);
    } else {
	const nameLenBN = new BN(attachmentSaveA.download.length);
	attachmentIdxBN = new BN(message.length).iuor(nameLenBN.ushln(248));
	message += attachmentSaveA.download + attachmentSaveA.href;
	console.log('send: attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
	console.log('send: message = ' + message);
    }
    //
    const sentMsgCtrBN = common.numberToBN(mtUtil.acctInfo.sentMsgCount);
    sendRecipientsWaitCount(sentMsgCtrBN, 0, message, attachmentIdxBN, function() {
	document.getElementById('msgTextArea').disabled = false;
	document.getElementById('attachmentButton').disabled = false;
	common.setMenuButtonState('privateKeyButton',   'Enabled');
	common.setMenuButtonState('loadAddrFileButton', 'Enabled');
	common.setMenuButtonState('setFiltersButton',   'Enabled');
	common.setMenuButtonState('sendButton',         'Enabled');
	displayFeesAndMsgCnt();
    });
}


//
// this fcn calls sendRecipient, but first it waits until the sentMsgCount is equal to the passed value.
// the purpose is to ensure that we don't send consecutive messages too quickly, since each message must be encrypted by the strictly increasing
// message count.
//
// this fcn and sendRecipients are a recursive pair
//
function sendRecipientsWaitCount(countBN, idx, message, attachmentIdxBN, cb) {
    mtUtil.refreshAcctInfo(true, function(err, _acctInfo) {
	const sentMsgCtrBN = common.numberToBN(_acctInfo.sentMsgCount);
	if (sentMsgCtrBN.lt(countBN)) {
	    common.setLoadingIcon('start');
	    setTimeout(sendRecipientsWaitCount, 5000, countBN, idx, message, attachmentIdxBN, cb);
	    return;
	}
	common.setLoadingIcon(null);
	//sendRecipients will call mtUtil.encryptMsg, which will pick up the new acctInfo
	sendRecipients(idx, message, attachmentIdxBN, cb);
    });
}


//
// recursively send message to all recipients
// message already includes any attachment
//
function sendRecipients(idx, message, attachmentIdxBN, cb) {
    const totalFeesMsg = 'Total Fees: ' + ether.convertWeiBNToComfort(index.totalFeesBN);
    if (idx >= index.recipients.length) {
	const sentMsg = 'sent to ' + index.recipients.length.toString(10) + ' recipients';
	showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + totalFeesMsg + ' | ' + sentMsg);
	selectAddrListEntry(-1);
	cb();
	return;
    }
    const recipientIdx = index.recipients[idx];
    const addrInfo = index.addrList[recipientIdx];
    if (!addrInfo || !addrInfo.idx) {
	console.log('huh? addrInfo = ' + addrInfo + ', idx = ' + idx + ', recipients.length = ' + index.recipients.length + ', recipientIdx = ' + recipientIdx);
	console.log('huh? addrInfo.ix = ' + (!!addrInfo && addrInfo.idx) + ', addrList.length = ' + index.addrList.length);
    }
    const sendingMsg = 'sending to recipient #' + idx.toString(10) + ' (address #' + (addrInfo.idx + 1).toString(10) + ')';
    showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + totalFeesMsg + ' | ' + sendingMsg);
    //
    const elem = index.addrListElems[addrInfo.idx];
    elem.sendArea.value = 'now sending!';
    selectAddrListEntry(recipientIdx)
    common.replaceClassFromTo(elem.sendArea, 'notBlinking', 'blinking', true);
    mtUtil.encryptMsg(addrInfo.addr, message, function(err, msgFee, encrypted, msgNoBN) {
	if (!!err) {
	    alert(err);
	    handleUnlockedMetaMask(null);
	    return;
	}
	const msgRefButton = document.getElementById('msgRefButton');
	const ref = '0';
	const gasLimit = 0;
	gasPriceBN = new BN(ether.gweiHex, 16)
	//TODO: let user specify gas price
	gasPriceBN.imuln(20);
	mtEther.sendMessagePK(index.privateKey, addrInfo.addr, attachmentIdxBN, ref, encrypted, msgFee, gasLimit, gasPriceBN.toString(10), function(err, txid) {
	    console.log('sendMessagePK cb: err = ' + err + ', txid = ' + txid);
	    const cbFcn = (err, receipt) => {
		console.log('waitForTXID cb: err = ' + err + ', receipt = ' + (!!receipt ? JSON.stringify(receipt) : ' null'));
		if (!!err) {
		    elem.sendArea.value = 'send error!';
		} else {
		    mtUtil.acctInfo.sentMsgCount = msgNoBN.toString(10);
		    elem.sendArea.value = 'sent!';
		    common.replaceClassFromTo(elem.sendArea, 'blinking', 'notBlinking', true);
		}
		common.waitingForTxid = false;
		common.clearStatusDiv();
		console.log('waitForTXID cb: mtUtil.acctInfo.sentMsgCount = ' + mtUtil.acctInfo.sentMsgCount);
		//sendRecipientsWaitCount will clear the loading icon
		common.setLoadingIcon('start');
		setTimeout(sendRecipientsWaitCount, 5000, msgNoBN, idx + 1, message, attachmentIdxBN, cb);
	    };
	    common.waitForTXID(err, txid, 'Send-Message', null, ether.etherscanioTxStatusHost, cbFcn);
	});
    });
}


function selectAddrListEntry(newIdx) {
    if (newIdx != index.elemIdx) {
	if (index.elemIdx >= 0) {
	    const addrInfo = index.addrList[index.elemIdx];
	    const elem = index.addrListElems[index.elemIdx];
	    const newSuffix = addrInfo.sendable ? 'Valid' : '';
	    elem.div.className = 'addrListItemDiv' + newSuffix;
	}
	index.elemIdx = newIdx;
	if (index.elemIdx >= 0) {
	    const addrInfo = index.addrList[index.elemIdx];
	    const elem = index.addrListElems[index.elemIdx];
	    const newSuffix = addrInfo.sendable ? 'Valid' : '';
	    elem.div.className = 'addrListItemDivSelected' + newSuffix;
	    elem.div.scrollIntoView({ block: "nearest" });
	    document.getElementById('msgFeeArea').value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(addrInfo.feeBN));
	    document.getElementById('msgAddrArea').value = (!!addrInfo.ensName) ? addrInfo.ensName + ' (' + addrInfo.addr + ')' : addrInfo.addr;
	} else {
	    document.getElementById('msgFeeArea').value = '';
	    document.getElementById('msgAddrArea').value = '';
	}
    }
}


function showStatus(statusMsg) {
    document.getElementById('statusLine').value = 'status: ' + statusMsg;
}


function displayFeesAndMsgCnt() {
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    totalReceivedArea.value = 'Messages sent: ' + mtUtil.acctInfo.sentMsgCount + '; Messages received: ' + mtUtil.acctInfo.recvMsgCount;
    const feebalanceWei = mtUtil.acctInfo.feeBalance;
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiBNToComfort(common.numberToBN(feebalanceWei));
}

//  LocalWords:  const
