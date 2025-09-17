// SPDX-License-Identifier: Apache-2.0
// Binary version: 3.1.0
pragma solidity >=0.8.0 <0.9.0;

library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b);
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0);
        uint256 c = a / b;
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;
        return c;
    }
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);
        return c;
    }
}

library Array {
    function addUint(
        uint256[] memory oldArray,
        uint256 data
    ) internal pure returns (uint256[] memory newArray) {
        newArray = new uint256[](oldArray.length + 1);
        for (uint256 i = 0; i < oldArray.length; i++) {
            newArray[i] = oldArray[i];
        }
        newArray[oldArray.length] = data;
        return newArray;
    }
    function addAddress(
        address[] memory oldArray,
        address data
    ) internal pure returns (address[] memory newArray) {
        newArray = new address[](oldArray.length + 1);
        for (uint i = 0; i < oldArray.length; i++) {
            newArray[i] = oldArray[i];
        }
        newArray[oldArray.length] = data;
        return newArray;
    }
    function addBool(
        bool[] memory oldArray,
        bool data
    ) internal pure returns (bool[] memory newArray) {
        newArray = new bool[](oldArray.length + 1);
        for (uint i = 0; i < oldArray.length; i++) {
            newArray[i] = oldArray[i];
        }
        newArray[oldArray.length] = data;
        return newArray;
    }
}

interface TRC20_Interface {
    function allowance(
        address _owner,
        address _spender
    ) external view returns (uint);
    function transferFrom(
        address _from,
        address _to,
        uint _value
    ) external returns (bool);
    function transfer(address direccion, uint cantidad) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
    function decimals() external view returns (uint);
}

interface Proxy_Interface {
    function admin() external view returns (address);
    function changeAdmin(address _admin) external;
    function upgradeTo(address _implementation) external;
    function version() external view returns (uint256);
}

contract Storage1 {
    TRC20_Interface USDT_Contract;
    Proxy_Interface Proxy_Contract;
    struct Deposito {
        uint256 inicio;
        uint256 valor;
        uint256 factor;
        uint256 retirado;
        bool pasivo;
    }
    struct Investor {
        bool registered;
        uint256 invested;
        uint256 paidAt;
        uint256 withdrawn;
    }
    mapping(address => Investor) public investors;
    mapping(address => Deposito[]) public depositos;
    mapping(address => uint256) public ventaDirecta;
    mapping(address => uint256) public binario;
    mapping(address => uint256) public matchingBonus;
    mapping(address => uint256) public retirableA;
    mapping(address => uint256) internal puntosUsados;
    mapping(address => address) public padre;
    mapping(address => address[]) public hijosLeft;
    mapping(address => address[]) public hijosRight;
    mapping(uint256 => address) public idToAddress;
    mapping(address => uint256) public addressToId;
    mapping(address => bool[]) public rangoReclamado;
    mapping(address => uint256) public leveling;
    mapping(address => uint256) public lastPay;
    address public taken;
    address public API;
    uint256 public precision;
    uint256 public MIN_RETIRO;
    uint256 public MAX_RETIRO;
    uint256 public GanaMax;
    uint256 public plan;
    uint256[] public porcientos;
    uint256[] public porcientosSalida;
    bool[] public espaciosRango;
    uint256[] public puntosRango;
    uint256[] public gananciasRango;
    bool public onOffWitdrawl;
    uint256 public timerOut;
    uint256 public porcent;
    uint256 public porcentPuntosBinario;
    uint256 public directosBinario;
    uint256 public dias;
    uint256 public totalInvested;
    uint256 public totalRefRewards;
    uint256 public totalRefWitdrawl;
    uint256 public lastUserId;
    uint256[] public valorFee;
    address[] public walletFee;
    address[] public walletRegistro;
    uint256 public precioRegistro;
    uint256[] public porcientoRegistro;
    address[] public wallet;
    uint256[] public valor;
    bool public iniciado = true;
}

contract Inicial is Storage1 {
    function inicializar() public {
        require(!iniciado);
        USDT_Contract = TRC20_Interface(
            0x55d398326f99059fF775485246999027B3197955
        );
        Proxy_Contract = Proxy_Interface(address(this));
        require(Proxy_Contract.admin() == msg.sender);
        iniciado = true;
        leveling[msg.sender] = 1;
        Investor storage usuario = investors[msg.sender];
        usuario.registered = true;
        espaciosRango = [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];
        rangoReclamado[msg.sender] = espaciosRango;
        idToAddress[0] = msg.sender;
        addressToId[msg.sender] = 0;
        precision = 1000; // preciocion en decimales de porcentajes 100_0
        MIN_RETIRO = 5 * 10 ** 18;
        MAX_RETIRO = 3000 * 10 ** 18;
        plan = 25 * 10 ** 18;
        porcientos = [500]; // 50% VD (Venta Directa)
        porcientosSalida = [8, 8, 8, 8, 8]; // 0.8% para cada nivel (8/10 = 0.8%)
        gananciasRango = [
            10 * 10 ** 18,
            20 * 10 ** 18,
            60 * 10 ** 18,
            100 * 10 ** 18,
            200 * 10 ** 18,
            600 * 10 ** 18,
            1000 * 10 ** 18,
            2000 * 10 ** 18,
            6000 * 10 ** 18,
            10000 * 10 ** 18,
            20000 * 10 ** 18,
            30000 * 10 ** 18,
            50000 * 10 ** 18
        ];
        puntosRango = [
            100 * 10 ** 18,
            400 * 10 ** 18,
            1000 * 10 ** 18,
            4000 * 10 ** 18,
            10000 * 10 ** 18,
            20000 * 10 ** 18,
            50000 * 10 ** 18,
            100000 * 10 ** 18,
            400000 * 10 ** 18,
            1000000 * 10 ** 18,
            4000000 * 10 ** 18,
            10000000 * 10 ** 18,
            100000000 * 10 ** 18
        ];
        onOffWitdrawl = true;
        timerOut = 86400;
        porcent = 300; // 300% global return
        porcentPuntosBinario = 200; // 20% binario (200/10 = 20%)
        directosBinario = 2;
        dias = 365; // Default 365 days
        lastUserId = 1;
        precioRegistro = 10 * 10 ** 18;
        walletRegistro = [
            0x642974e00445f31c50e7CEC34B24bC8b6aefd3De,
            0x2198b0D4f54925DCCA173a84708BA284Ac85Cc37
        ];
        porcientoRegistro = [500, 500];
        wallet = [
            0x0c4c6519E8B6e4D9c99b09a3Cda475638c930b00,
            0x361Db60d275b4328Fd35733b93ceB1A3D22BBf6A,
            0x4593739d3A5849562E7e647B44b9a7ee3Ba1E8D5
        ];
        valor = [1, 5, 24]; // 1% Steven, 5% wallet1, 24% wallet2 (70% stays in contract)
        walletFee = [
            0x642974e00445f31c50e7CEC34B24bC8b6aefd3De,
            0x2198b0D4f54925DCCA173a84708BA284Ac85Cc37,
            address(this)
        ];
        valorFee = [80, 80, 80]; // 8% fee distributed equally among 3 wallets (8% total)
    }
}

contract BinarySystemV3 is Inicial {
    using SafeMath for uint256;
    using Array for uint256[];
    using Array for address[];
    using Array for bool[];

    constructor() {}
    function setstate()
        public
        view
        returns (uint256 Investors, uint256 Invested, uint256 RefRewards)
    {
        return (lastUserId, totalInvested, totalRefRewards);
    }

    function tiempo() public view returns (uint256) {
        return dias * 86400; // dias * seconds per day
    }
   
    function column(
        address yo,
        uint256 _largo
    ) public view returns (address[] memory res) {
        for (uint256 i = 0; i < _largo; i++) {
            res = res.addAddress(padre[yo]);
            yo = padre[yo];
        }
    }

    function verDepositos(
        address _user
    )
        public
        view
        returns (
            bool[] memory activo,
            uint256 total,
            uint256 topay,
            uint256 retirado
        )
    {
        Investor memory usuario = investors[_user];
        for (uint i = 0; i < depositos[_user].length; i++) {
            Deposito memory dep = depositos[_user][i];
            uint finish = dep.inicio + tiempo();
            uint since = usuario.paidAt > dep.inicio
                ? usuario.paidAt
                : dep.inicio;
            uint till = block.timestamp > finish ? finish : block.timestamp;
            uint ganable = (dep.valor.mul(dep.factor).div(100)).sub(
                dep.retirado
            );
            if (since != 0 && since < till && ganable > 0) {
                if (dep.pasivo) {
                    total += (ganable * (till - since)) / tiempo();
                }
                activo = activo.addBool(true);
            } else {
                activo = activo.addBool(false);
            }
            topay = topay.add(ganable);
            retirado = retirado.add(dep.retirado);
        }
    }

    function verListaDepositos(
        address _user
    ) public view returns (Deposito[] memory) {
        return depositos[_user];
    }
    function rewardReferers(
        address yo,
        uint256 amount,
        uint256[] memory array,
        bool _salida
    ) internal {
        address[] memory referi;
        referi = column(yo, array.length);
        uint256 a;
        Investor storage usuario;
        uint256 amountUser;
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] != 0) {
                usuario = investors[referi[i]];
                (, , amountUser, ) = verDepositos(referi[i]);
                if (usuario.registered && amountUser > 0) {
                    if (referi[i] != address(0)) {
                        a = amount.mul(array[i]).div(precision);
                        if (amountUser > a) {
                            discountDeposits(referi[i], a);
                            if (_salida) {
                                matchingBonus[referi[i]] += a;
                            } else {
                                ventaDirecta[referi[i]] += a;
                            }
                            totalRefRewards += a;
                        } else {
                            if (_salida) {
                                matchingBonus[referi[i]] += amountUser;
                            } else {
                                ventaDirecta[referi[i]] += amountUser;
                            }
                            totalRefRewards += amountUser;
                            discountDeposits(referi[i], amountUser);
                        }
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
        }
    }
    function discountDeposits(address _user, uint256 _valor) internal {
        Deposito storage dep;

        for (uint i = 0; i < depositos[_user].length; i++) {
            if (_valor > 0) {
                dep = depositos[_user][i];
                if (
                    _valor >
                    dep.valor.mul(dep.factor).div(precision).sub(dep.retirado)
                ) {
                    _valor = _valor.sub(
                        dep.valor.mul(dep.factor).div(precision).sub(dep.retirado)
                    );
                    dep.retirado = dep.valor.mul(dep.factor).div(precision);
                } else {
                    dep.retirado = dep.retirado.add(_valor);
                    delete _valor;
                }
            }
        }
    }

    function registro(address _sponsor, uint8 _hand) public {
        if (precioRegistro > 0) {
            if (
                !USDT_Contract.transferFrom(
                    msg.sender,
                    address(this),
                    precioRegistro
                )
            ) revert();
            for (uint256 i = 0; i < walletRegistro.length; i++) {
                if (walletRegistro[i] != address(this)) {
                    USDT_Contract.transfer(
                        walletRegistro[i],
                        precioRegistro.mul(porcientoRegistro[i]).div(precision)
                    );
                }
            }
        }
        rangoReclamado[msg.sender] = espaciosRango;
        idToAddress[lastUserId] = msg.sender;
        addressToId[msg.sender] = lastUserId;
        lastUserId++;
        if (investors[msg.sender].registered) revert();
        _registro(msg.sender, _sponsor, _hand);
    }
    function _registro(address _user, address _sponsor, uint8 _hand) internal {
        investors[_user].registered = true;
        if (_sponsor != address(0) && padre[_user] == address(0)) {
            padre[_user] = _sponsor;
            if (_hand == 0) {
                hijosLeft[_sponsor].push(_user);
            } else {
                hijosRight[_sponsor].push(_user);
            }
        }
    }
    function buyPlan(uint256 _value) public {
        _value = plan * _value;
        totalInvested += _value;
        if (!USDT_Contract.transferFrom(msg.sender, address(this), _value))
            revert();
        for (uint256 i = 0; i < wallet.length; i++) {
            if (wallet[i] != address(this)) {
                USDT_Contract.transfer(
                    wallet[i],
                    _value.mul(valor[i]).div(100)
                );
            }
        }
        _buyPlan(msg.sender, _value, false);
        rewardReferers(msg.sender, _value, porcientos, false);
    }
    function _buyPlan(
        address _user,
        uint256 _value,
        bool _passive
    ) private {
        if (_value < 0) revert();
        Investor storage usuario = investors[_user];
        if (!usuario.registered) revert();
        depositos[_user].push(
            Deposito(block.timestamp, _value, porcent, 0, _passive)
        );
        usuario.invested += _value;
    }

    function withdrawableRange(
        address any_user
    ) public view returns (uint256 amount) {
        amount = puntosUsados[any_user];
    }

    function newRecompensa() public {
        if (!onOffWitdrawl) revert();
        uint256 amount = withdrawableRange(msg.sender);
        for (uint256 index = 0; index < gananciasRango.length; index++) {
            if (
                amount >= puntosRango[index] &&
                !rangoReclamado[msg.sender][index]
            ) {
                if (USDT_Contract.transfer(msg.sender, gananciasRango[index])) {
                    rangoReclamado[msg.sender][index] = true;
                }
            }
        }
    }

    function withdrawablePassive(
        address any_user
    ) public view returns (uint256 amount) {
        (, amount, , ) = verDepositos(any_user);
    }

    function withdrawable(address _user) public view returns (uint256 amount) {
        amount = ventaDirecta[_user]
            .add(binario[_user])
            .add(matchingBonus[_user])
            .add(withdrawablePassive(_user));

    }
    function corteBinarioDo(
        address any_user,
        uint256 _binario,
        uint256 _puntosUsados,
        uint256 _descontarDepositos
    ) public {
        onlyApi();
        require(investors[any_user].registered);
        if (_puntosUsados > puntosUsados[any_user]) {
            puntosUsados[any_user] = _puntosUsados;
        }

        if (_binario > 0) {
            binario[any_user] = binario[any_user].add(_binario);
        }

        if (_descontarDepositos > 0) {
            discountDeposits(any_user, _descontarDepositos);
        }

        retirableA[any_user] = retirableA[any_user].add(withdrawable(any_user));

        discountDeposits(
            any_user,
            ventaDirecta[any_user].add(binario[any_user]).add(
                matchingBonus[any_user]
            )
        );
        delete ventaDirecta[any_user];
        delete binario[any_user];
        delete matchingBonus[any_user];

        investors[any_user].paidAt = block.timestamp;

    }
   
    function withdraw() public {
        if (!onOffWitdrawl) revert();
        if (lastPay[msg.sender] + timerOut > block.timestamp) revert();
        uint256 _value = retirableA[msg.sender];
        if (_value < MIN_RETIRO) revert();
        if (
            investors[msg.sender].withdrawn.add(_value) >
            investors[msg.sender].invested.mul(porcent).div(100)
        ) {
            _value = (investors[msg.sender].invested.mul(porcent).div(100)).sub(
                investors[msg.sender].withdrawn
            );
        }
        investors[msg.sender].withdrawn = investors[msg.sender].withdrawn.add(
            _value
        );
        if (_value > MAX_RETIRO) {
            GanaMax += _value - MAX_RETIRO;
            _value = MAX_RETIRO;
        }
        if (USDT_Contract.balanceOf(address(this)) < _value) revert();
        uint256 totalFee = 0;
        for (uint256 i = 0; i < walletFee.length; i++) {
            if (walletFee[i] != address(this)) {
                USDT_Contract.transfer(
                    walletFee[i],
                    _value.mul(valorFee[i]).div(1000)
                );
            }
            totalFee = totalFee.add(valorFee[i]);
        }

        uint256 userAmount = _value.mul(1000 - totalFee).div(1000);
        USDT_Contract.transfer(msg.sender, userAmount);
        rewardReferers(msg.sender, _value, porcientosSalida, true);

        delete retirableA[msg.sender];
        totalRefWitdrawl += _value;
        lastPay[msg.sender] = block.timestamp;
    }
    function owner() public pure returns (address) {
        return address(0);
    }
    function onlyOwner() internal view {
        require(leveling[msg.sender] <= 1 && leveling[msg.sender] != 0);
    }
    function onlySubOwner() internal view {
        require(leveling[msg.sender] <= 2 && leveling[msg.sender] != 0);
    }
    function onlyLeader() internal view {
        require(leveling[msg.sender] <= 3 && leveling[msg.sender] != 0);
    }
    function onlyAdmin() internal view {
        require(leveling[msg.sender] <= 4 && leveling[msg.sender] != 0);
    }
    function makeNewLevel(address payable _newadmin, uint256 _level) public {
        require(
            leveling[msg.sender] >= 1 &&
                leveling[msg.sender] <= 2 &&
                _level >= leveling[msg.sender] &&
                _newadmin != address(0)
        );
        leveling[_newadmin] = _level;
    }
    function makeRemoveLevel(address payable _oldadmin) public {
        require(
            leveling[msg.sender] >= 1 &&
                leveling[msg.sender] <= 2 &&
                _oldadmin != address(0)
        );
        delete leveling[_oldadmin];
    }

    function onlyApi() internal view {
        require(API == msg.sender);
    }
    function makeNewApi(address payable _newapi) public {
        onlyOwner();
        API = _newapi;
    }
    function asignFreeMembership(
        address _user,
        address _sponsor,
        uint8 _hand
    ) public {
        onlyAdmin();
        require(!investors[_user].registered);
        rangoReclamado[_user] = espaciosRango;
        idToAddress[lastUserId] = _user;
        addressToId[_user] = lastUserId;
        lastUserId++;
        _registro(_user, _sponsor, _hand);
    }
    
    function asignarPlan(
        address _user,
        uint256 _plan,
        bool _depago
    ) public {
        onlyAdmin();
        _plan = plan * _plan;
        _buyPlan(_user, _plan, _depago);
    }
    function setPrecioRegistro(
        uint256 _precio,
        uint256[] memory _porcentaje
    ) public {
        onlySubOwner();
        precioRegistro = _precio;
        porcientoRegistro = _porcentaje;
    }
    function controlWitdrawl(bool _true_false) public {
        onlySubOwner();
        onOffWitdrawl = _true_false;
    }
    function setPorcientos(uint256 _nivel, uint256 _value) public {
        onlySubOwner();
        porcientos[_nivel] = _value;
    }
    function setPorcientosSalida(uint256 _nivel, uint256 _value) public {
        onlySubOwner();
        porcientosSalida[_nivel] = _value;
    }
    function setWalletstransfers(
        address[] memory _wallets,
        uint256[] memory _valores
    ) public {
        onlySubOwner();
        wallet = _wallets;
        valor = _valores;
    }
    function setWalletFee(
        address[] calldata _wallet,
        uint256[] calldata _fee
    ) public {
        onlySubOwner();
        walletFee = _wallet;
        valorFee = _fee;
    }
    function setMIN_RETIRO(uint256 _min) public {
        onlySubOwner();
        MIN_RETIRO = _min;
    }
    function setMAX_RETIRO(uint256 _max) public {
        onlySubOwner();
        MAX_RETIRO = _max;
    }
    function setPlan(uint256 _value) public {
        onlySubOwner();
        plan = _value;
    }
    function setDias(uint256 _dias) public {
        onlySubOwner();
        dias = _dias;
    }
    function setTimerOut(uint256 _segundos) public {
        onlySubOwner();
        timerOut = _segundos;
    }
    function setRetorno(uint256 _porcent) public {
        onlySubOwner();
        porcent = _porcent;
    }
    function updateTotalInvestors(uint256 _index) public {
        onlySubOwner();
        lastUserId = _index;
    }
    function redimToken() public {
        onlyOwner();
        USDT_Contract.transfer(
            msg.sender,
            USDT_Contract.balanceOf(address(this))
        );
    }
    function redimBNB() public {
        onlyOwner();
        payable(msg.sender).transfer(address(this).balance);
    }
    fallback() external payable {}
    receive() external payable {}
}
